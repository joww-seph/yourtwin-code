import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    index: true
  },
  provider: {
    type: String,
    enum: ['ollama', 'gemini'],
    required: true
  },
  model: {
    type: String,
    required: true
  },
  requestType: {
    type: String,
    enum: ['hint', 'comprehension', 'socratic', 'analysis'],
    required: true
  },
  hintLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  promptTokens: {
    type: Number,
    default: 0
  },
  completionTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  estimatedCost: {
    type: Number,
    default: 0 // USD, only applicable for Gemini
  },
  responseTime: {
    type: Number, // milliseconds
    default: 0
  },
  success: {
    type: Boolean,
    default: true
  },
  fallbackUsed: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String
  },
  metadata: {
    queueLength: Number,
    fallbackReason: String
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
aiUsageSchema.index({ createdAt: -1 });
aiUsageSchema.index({ studentId: 1, createdAt: -1 });
aiUsageSchema.index({ provider: 1, createdAt: -1 });
aiUsageSchema.index({ requestType: 1, createdAt: -1 });

// Static method: Get usage stats for a student
aiUsageSchema.statics.getStudentStats = async function(studentId, startDate = null, endDate = null) {
  const match = { studentId: new mongoose.Types.ObjectId(studentId) };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
        totalTokens: { $sum: '$totalTokens' },
        totalCost: { $sum: '$estimatedCost' },
        avgResponseTime: { $avg: '$responseTime' },
        ollamaRequests: { $sum: { $cond: [{ $eq: ['$provider', 'ollama'] }, 1, 0] } },
        geminiRequests: { $sum: { $cond: [{ $eq: ['$provider', 'gemini'] }, 1, 0] } },
        fallbackCount: { $sum: { $cond: ['$fallbackUsed', 1, 0] } },
        hintsByLevel: {
          $push: {
            $cond: [
              { $eq: ['$requestType', 'hint'] },
              '$hintLevel',
              '$$REMOVE'
            ]
          }
        }
      }
    }
  ]);

  return stats[0] || {
    totalRequests: 0,
    successfulRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    avgResponseTime: 0,
    ollamaRequests: 0,
    geminiRequests: 0,
    fallbackCount: 0
  };
};

// Static method: Get daily usage stats
aiUsageSchema.statics.getDailyStats = async function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          provider: '$provider'
        },
        requests: { $sum: 1 },
        tokens: { $sum: '$totalTokens' },
        cost: { $sum: '$estimatedCost' },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
};

// Static method: Get provider comparison
aiUsageSchema.statics.getProviderComparison = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$provider',
        totalRequests: { $sum: 1 },
        successRate: { $avg: { $cond: ['$success', 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        totalTokens: { $sum: '$totalTokens' },
        totalCost: { $sum: '$estimatedCost' }
      }
    }
  ]);
};

// Instance method: Log usage after a request
aiUsageSchema.statics.logUsage = async function(data) {
  const {
    studentId,
    activityId,
    provider,
    model,
    requestType,
    hintLevel,
    tokenUsage = {},
    responseTime,
    success = true,
    fallbackUsed = false,
    errorMessage,
    metadata = {}
  } = data;

  // Calculate estimated cost for Gemini
  let estimatedCost = 0;
  if (provider === 'gemini') {
    // Gemini 1.5 Flash pricing
    const inputCost = (tokenUsage.prompt || 0) / 1000000 * 0.075;
    const outputCost = (tokenUsage.completion || 0) / 1000000 * 0.30;
    estimatedCost = inputCost + outputCost;
  }

  return this.create({
    studentId,
    activityId,
    provider,
    model,
    requestType,
    hintLevel,
    promptTokens: tokenUsage.prompt || 0,
    completionTokens: tokenUsage.completion || 0,
    totalTokens: tokenUsage.total || 0,
    estimatedCost,
    responseTime,
    success,
    fallbackUsed,
    errorMessage,
    metadata
  });
};

const AIUsage = mongoose.model('AIUsage', aiUsageSchema);

export default AIUsage;
