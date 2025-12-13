import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'passed', 'failed', 'error'],
    default: 'pending'
  },
  testResults: [{
    testCaseId: mongoose.Schema.Types.ObjectId,
    passed: Boolean,
    actualOutput: String,
    expectedOutput: String,
    executionTime: Number,
    memory: Number,
    status: String,
    stderr: String,
    compileOutput: String
  }],
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  executionTime: {
    type: Number // Total execution time in seconds
  },
  aiRequestsCount: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // Time spent coding in seconds
    default: 0
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  isLockdownMode: {
    type: Boolean,
    default: false
  },
  // NEW FIELDS
  isBestScore: {
    type: Boolean,
    default: false
  },
  compileError: {
    type: String
  },
  runtimeError: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
submissionSchema.index({ student: 1, activity: 1 });
submissionSchema.index({ student: 1, createdAt: -1 });
submissionSchema.index({ activity: 1, createdAt: -1 });

// Method to mark as best score
submissionSchema.statics.updateBestScore = async function(studentId, activityId) {
  // Reset all previous best scores
  await this.updateMany(
    { student: studentId, activity: activityId },
    { isBestScore: false }
  );
  
  // Find and mark the submission with highest score
  const bestSubmission = await this.findOne({
    student: studentId,
    activity: activityId
  }).sort({ score: -1, createdAt: 1 });
  
  if (bestSubmission) {
    bestSubmission.isBestScore = true;
    await bestSubmission.save();
  }
};

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;