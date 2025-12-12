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
    executionTime: Number,
    memory: Number
  }],
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  executionTime: {
    type: Number // in milliseconds
  },
  aiRequestsCount: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  isLockdownMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
submissionSchema.index({ student: 1, activity: 1 });
submissionSchema.index({ student: 1, createdAt: -1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;