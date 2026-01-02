import mongoose from 'mongoose';

/**
 * Activity Model (BCNF Compliant)
 * Test cases are now in separate TestCase collection.
 * Belongs to a lab session.
 */
const activitySchema = new mongoose.Schema({
  labSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabSession',
    required: [true, 'Activity must belong to a lab session']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  type: {
    type: String,
    enum: ['practice', 'final'],
    default: 'practice'
  },
  topic: {
    type: String,
    required: [true, 'Topic is required']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  language: {
    type: String,
    enum: ['c', 'cpp', 'java', 'python'],
    required: [true, 'Language is required']
  },
  starterCode: {
    type: String,
    default: ''
  },
  instructions: {
    type: String,
    default: ''
  },
  timeLimit: {
    type: Number, // in minutes
    default: 60
  },
  maxAttempts: {
    type: Number,
    default: 0 // 0 = unlimited
  },
  aiAssistanceLevel: {
    type: Number,
    min: 0, // 0 = lockdown
    max: 5, // 5 = full assistance
    default: 5
  },
  orderInSession: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Virtual for test cases (fetched from TestCase collection)
activitySchema.virtual('testCases', {
  ref: 'TestCase',
  localField: '_id',
  foreignField: 'activityId'
});

// Ensure virtuals are included in JSON
activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

// Indexes
activitySchema.index({ labSession: 1, orderInSession: 1 });
activitySchema.index({ labSession: 1, isActive: 1 });
activitySchema.index({ topic: 1 });
activitySchema.index({ createdBy: 1 });

// Static method to get activities with test cases
activitySchema.statics.getWithTestCases = function(activityId) {
  return this.findById(activityId)
    .populate('testCases')
    .populate('createdBy', 'firstName lastName email');
};

// Static method to get all activities for a session
activitySchema.statics.getBySession = function(labSessionId, includeInactive = false) {
  const query = { labSession: labSessionId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query)
    .populate('testCases')
    .sort({ orderInSession: 1 });
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
