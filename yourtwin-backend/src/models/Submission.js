import mongoose from 'mongoose';

/**
 * Submission Model (BCNF with Conscious Denormalization)
 *
 * DENORMALIZED FIELDS:
 * - labSessionId: Derived from activity.labSessionId
 *   Justification: Enables direct session-level queries without joining Activity
 *   Invariant: Must match activity's labSession (enforced by pre-save hook)
 */
const submissionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: true
  },
  // DENORMALIZED: From activity.labSession
  labSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabSession',
    required: true
  },
  code: {
    type: String,
    required: [true, 'Code is required']
  },
  language: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'passed', 'failed', 'error'],
    default: 'pending'
  },
  executionTime: {
    type: Number, // Total execution time in milliseconds
    default: 0
  },
  memoryUsed: {
    type: Number, // Memory used in KB
    default: 0
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  isBestScore: {
    type: Boolean,
    default: false
  },
  // Error tracking
  compileError: {
    type: String
  },
  runtimeError: {
    type: String
  },
  // AI assistance tracking
  aiRequestsCount: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, // Time spent coding in seconds
    default: 0
  },
  isLockdownMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for test results (fetched from TestResult collection)
submissionSchema.virtual('testResults', {
  ref: 'TestResult',
  localField: '_id',
  foreignField: 'submissionId'
});

// Ensure virtuals are included in JSON
submissionSchema.set('toJSON', { virtuals: true });
submissionSchema.set('toObject', { virtuals: true });

// Pre-save hook to enforce labSessionId invariant
submissionSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('activityId')) {
    const Activity = mongoose.model('Activity');
    const activity = await Activity.findById(this.activityId);

    if (!activity) {
      throw new Error('Activity not found');
    }

    // Ensure labSessionId matches activity's labSession
    this.labSessionId = activity.labSession;
  }

  next();
});

// Indexes for faster queries
submissionSchema.index({ studentId: 1, activityId: 1 });
submissionSchema.index({ studentId: 1, createdAt: -1 });
submissionSchema.index({ activityId: 1, createdAt: -1 });
submissionSchema.index({ labSessionId: 1 });
submissionSchema.index({ studentId: 1, labSessionId: 1 });
submissionSchema.index({ studentId: 1, isBestScore: 1 });

// Static method to update best score for a student/activity
submissionSchema.statics.updateBestScore = async function(studentId, activityId) {
  // Reset all previous best scores
  await this.updateMany(
    { studentId, activityId },
    { isBestScore: false }
  );

  // Find and mark the submission with highest score
  const bestSubmission = await this.findOne({
    studentId,
    activityId
  }).sort({ score: -1, createdAt: 1 });

  if (bestSubmission) {
    bestSubmission.isBestScore = true;
    await bestSubmission.save();
  }

  return bestSubmission;
};

// Static method to get submission stats for a student/activity
submissionSchema.statics.getStats = async function(studentId, activityId) {
  const submissions = await this.find({ studentId, activityId })
    .sort({ createdAt: -1 });

  if (submissions.length === 0) {
    return null;
  }

  const bestSubmission = submissions.reduce((best, curr) =>
    curr.score > best.score ? curr : best
  );

  return {
    totalAttempts: submissions.length,
    bestScore: bestSubmission.score,
    passed: bestSubmission.status === 'passed',
    lastSubmission: submissions[0]
  };
};

// Static method to get all submissions for a session
submissionSchema.statics.getBySession = function(labSessionId) {
  return this.find({ labSessionId })
    .populate('studentId')
    .populate('activityId')
    .sort({ createdAt: -1 });
};

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
