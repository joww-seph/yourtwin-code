import mongoose from 'mongoose';

const hintRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true,
    index: true
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  hintLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // Student's problem description
  studentDescription: {
    type: String,
    required: true,
    maxlength: 2000
  },
  // What they've tried
  studentAttempt: {
    type: String,
    maxlength: 2000
  },
  // Student's code at time of request
  studentCode: {
    type: String,
    maxlength: 50000
  },
  // Error output if any
  errorOutput: {
    type: String,
    maxlength: 5000
  },
  // The generated hint
  generatedHint: {
    type: String,
    required: true
  },
  // AI provider used
  provider: {
    type: String,
    enum: ['ollama', 'gemini'],
    required: true
  },
  model: {
    type: String,
    required: true
  },
  // Response metrics
  responseTime: {
    type: Number // milliseconds
  },
  tokenUsage: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  // Comprehension check (for Level 5)
  comprehensionRequired: {
    type: Boolean,
    default: false
  },
  comprehensionQuestion: {
    type: String
  },
  comprehensionAnswer: {
    type: String
  },
  comprehensionPassed: {
    type: Boolean
  },
  comprehensionAttempts: {
    type: Number,
    default: 0
  },
  // Hint effectiveness tracking
  wasHelpful: {
    type: Boolean // Student feedback
  },
  ledToSuccess: {
    type: Boolean // Did student pass after this hint?
  },
  // Request evaluation result
  requestEvaluation: {
    granted: { type: Boolean, default: true },
    reason: String,
    unlockCriteriaMet: [String]
  }
}, {
  timestamps: true
});

// Indexes
hintRequestSchema.index({ studentId: 1, activityId: 1, createdAt: -1 });
hintRequestSchema.index({ activityId: 1, createdAt: -1 });
hintRequestSchema.index({ hintLevel: 1 });

// Virtual: Time since request
hintRequestSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Static: Get hint history for a student on an activity
hintRequestSchema.statics.getHintHistory = async function(studentId, activityId) {
  return this.find({ studentId, activityId })
    .sort({ createdAt: -1 })
    .select('hintLevel generatedHint createdAt comprehensionPassed wasHelpful');
};

// Static: Count hints used by student on activity
hintRequestSchema.statics.countHintsUsed = async function(studentId, activityId) {
  return this.countDocuments({ studentId, activityId });
};

// Static: Get highest hint level used
hintRequestSchema.statics.getHighestLevelUsed = async function(studentId, activityId) {
  const result = await this.findOne({ studentId, activityId })
    .sort({ hintLevel: -1 })
    .select('hintLevel');
  return result?.hintLevel || 0;
};

// Static: Check if Level 4 comprehension was passed (required to unlock Level 5)
hintRequestSchema.statics.hasPassedComprehension = async function(studentId, activityId) {
  const result = await this.findOne({
    studentId,
    activityId,
    hintLevel: 4,  // Check Level 4 comprehension to unlock Level 5
    comprehensionPassed: true
  });
  return !!result;
};

// Static: Get effectiveness stats for an activity
hintRequestSchema.statics.getActivityHintStats = async function(activityId) {
  return this.aggregate([
    { $match: { activityId: new mongoose.Types.ObjectId(activityId) } },
    {
      $group: {
        _id: '$hintLevel',
        totalRequests: { $sum: 1 },
        helpfulCount: { $sum: { $cond: ['$wasHelpful', 1, 0] } },
        successCount: { $sum: { $cond: ['$ledToSuccess', 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Instance: Mark hint as helpful/not helpful
hintRequestSchema.methods.markHelpfulness = async function(wasHelpful) {
  this.wasHelpful = wasHelpful;
  return this.save();
};

// Instance: Mark if hint led to success
hintRequestSchema.methods.markSuccess = async function(ledToSuccess) {
  this.ledToSuccess = ledToSuccess;
  return this.save();
};

// Instance: Submit comprehension answer
hintRequestSchema.methods.submitComprehension = async function(answer, passed) {
  this.comprehensionAnswer = answer;
  this.comprehensionPassed = passed;
  this.comprehensionAttempts += 1;
  return this.save();
};

const HintRequest = mongoose.model('HintRequest', hintRequestSchema);

export default HintRequest;
