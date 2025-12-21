import mongoose from 'mongoose';

/**
 * TestCase Model - Separate from Activity (BCNF Compliant)
 * Each test case belongs to one activity.
 * Allows for more granular test case management.
 */
const testCaseSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  input: {
    type: String,
    default: ''
  },
  expectedOutput: {
    type: String,
    required: [true, 'Expected output is required']
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  weight: {
    type: Number,
    default: 1,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  orderIndex: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
testCaseSchema.index({ activityId: 1, orderIndex: 1 });

// Static method to get all test cases for an activity
testCaseSchema.statics.getByActivity = function(activityId) {
  return this.find({ activityId }).sort({ orderIndex: 1 });
};

// Static method to get visible test cases (for students)
testCaseSchema.statics.getVisibleByActivity = function(activityId) {
  return this.find({ activityId, isHidden: false }).sort({ orderIndex: 1 });
};

// Static method to calculate total weight for an activity
testCaseSchema.statics.getTotalWeight = async function(activityId) {
  const result = await this.aggregate([
    { $match: { activityId: new mongoose.Types.ObjectId(activityId) } },
    { $group: { _id: null, totalWeight: { $sum: '$weight' } } }
  ]);

  return result.length > 0 ? result[0].totalWeight : 0;
};

const TestCase = mongoose.model('TestCase', testCaseSchema);

export default TestCase;
