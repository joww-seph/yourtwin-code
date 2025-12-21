import mongoose from 'mongoose';

/**
 * StudentTwin Model (BCNF Compliant)
 * Represents the AI "digital twin" profile for a student.
 * Competencies are now tracked in separate StudentCompetency model.
 * Contains behavioral patterns and learning preferences.
 */
const studentTwinSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  // Personality and learning style
  personality: {
    type: String,
    enum: ['visual', 'auditory', 'kinesthetic', 'reading-writing', 'unknown'],
    default: 'unknown'
  },
  preferredDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'adaptive'],
    default: 'adaptive'
  },
  // Performance metrics
  averageTimePerProblem: {
    type: Number, // in minutes
    default: 0
  },
  // AI-derived insights (arrays of topic names)
  strengths: [{
    type: String,
    trim: true
  }],
  weaknesses: [{
    type: String,
    trim: true
  }],
  recommendedTopics: [{
    type: String,
    trim: true
  }],
  // Behavioral data
  behavioralData: {
    avgTypingSpeed: {
      type: Number, // characters per minute
      default: 0
    },
    avgThinkingPause: {
      type: Number, // seconds between keystrokes
      default: 0
    },
    errorFrequency: {
      type: Number, // average errors per session
      default: 0
    },
    aiDependencyScore: {
      type: Number, // 0-1, higher = more dependent on AI hints
      min: 0,
      max: 1,
      default: 0
    }
  },
  // Progress metrics
  learningVelocity: {
    type: Number, // Rate of improvement (positive = improving)
    default: 0
  },
  totalAIRequests: {
    type: Number,
    default: 0
  },
  totalActivitiesCompleted: {
    type: Number,
    default: 0
  },
  totalActivitiesAttempted: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date
  },
  lastAnalyzedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual to get competencies from StudentCompetency model
studentTwinSchema.virtual('competencies', {
  ref: 'StudentCompetency',
  localField: 'studentId',
  foreignField: 'studentId'
});

// Ensure virtuals are included in JSON
studentTwinSchema.set('toJSON', { virtuals: true });
studentTwinSchema.set('toObject', { virtuals: true });

// Note: studentId already has unique: true which creates an index

// Static method to get or create a student twin
studentTwinSchema.statics.getOrCreate = async function(studentId) {
  let twin = await this.findOne({ studentId });

  if (!twin) {
    twin = await this.create({ studentId });
  }

  return twin;
};

// Method to update after activity completion
studentTwinSchema.methods.recordActivity = async function(passed, aiRequests = 0) {
  this.totalActivitiesAttempted += 1;
  if (passed) {
    this.totalActivitiesCompleted += 1;
  }
  this.totalAIRequests += aiRequests;
  this.lastActivityDate = new Date();

  // Update AI dependency score
  if (this.totalActivitiesAttempted > 0) {
    this.behavioralData.aiDependencyScore = Math.min(
      this.totalAIRequests / (this.totalActivitiesAttempted * 5), // Normalize: 5 requests per activity = 1.0
      1
    );
  }

  return this.save();
};

// Method to update strengths and weaknesses from competencies
studentTwinSchema.methods.updateInsights = async function() {
  const StudentCompetency = mongoose.model('StudentCompetency');

  const [strengths, weaknesses] = await Promise.all([
    StudentCompetency.getStrengths(this.studentId, 3),
    StudentCompetency.getWeaknesses(this.studentId, 3)
  ]);

  this.strengths = strengths.map(c => c.topic);
  this.weaknesses = weaknesses.map(c => c.topic);

  // Generate recommendations based on weaknesses
  this.recommendedTopics = weaknesses.map(c => c.topic);

  this.lastAnalyzedAt = new Date();

  return this.save();
};

// Static method to get twin with competencies populated
studentTwinSchema.statics.getWithCompetencies = function(studentId) {
  return this.findOne({ studentId }).populate('competencies');
};

const StudentTwin = mongoose.model('StudentTwin', studentTwinSchema);

export default StudentTwin;
