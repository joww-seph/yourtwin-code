import mongoose from 'mongoose';

/**
 * StudentTwin Model (BCNF Compliant) - MIRROR TWIN
 *
 * This model represents the MIRROR TWIN - an exact replica of the student's
 * learning data, behavioral patterns, and cognitive profile. It stores:
 * - Personality and learning style preferences
 * - Performance metrics and competency levels
 * - Behavioral data (typing speed, thinking pauses, coding patterns)
 * - AI dependency patterns and learning velocity
 *
 * The Mirror Twin is used to:
 * - Determine the optimal learning path for the student
 * - Run simulations to find the best teaching strategies
 * - Track progress and identify areas for improvement
 *
 * The SHADOW TWIN (implemented in shadowTwinEngine.js) is the cognitive opposite
 * of the student - where the student's weaknesses are the Shadow Twin's strengths.
 * The Shadow Twin provides hints and guidance through peer-to-peer learning.
 *
 * Competencies are tracked in separate StudentCompetency model.
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
    },
    // Enhanced behavioral metrics
    avgActiveTimePercentage: {
      type: Number, // % of session actively coding
      min: 0,
      max: 100,
      default: 100
    },
    codingPatternType: {
      type: String,
      enum: ['incremental_builder', 'iterative_refiner', 'modifier', 'balanced', 'unknown'],
      default: 'unknown'
    },
    avgPasteFrequency: {
      type: Number, // paste events per session
      default: 0
    }
  },
  // Code revision analysis
  codeRevisionMetrics: {
    avgRevisionsPerActivity: { type: Number, default: 0 },
    avgLinesAddedPerSession: { type: Number, default: 0 },
    avgLinesModifiedPerSession: { type: Number, default: 0 },
    preferredCodingStyle: {
      type: String,
      enum: ['write_then_debug', 'incremental', 'copy_modify', 'unknown'],
      default: 'unknown'
    }
  },
  // Progress metrics
  learningVelocity: {
    type: Number, // Rate of improvement (positive = improving)
    default: 0
  },
  // Historical learning velocity for trend analysis
  velocityHistory: [{
    date: { type: Date },
    velocity: { type: Number },
    activitiesCompleted: { type: Number }
  }],
  totalAIRequests: {
    type: Number,
    default: 0
  },
  totalHintsSuccessful: {
    type: Number, // Hints that led to successful submission
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
  // Difficulty-weighted success tracking
  difficultyStats: {
    easy: { attempted: { type: Number, default: 0 }, completed: { type: Number, default: 0 } },
    medium: { attempted: { type: Number, default: 0 }, completed: { type: Number, default: 0 } },
    hard: { attempted: { type: Number, default: 0 }, completed: { type: Number, default: 0 } }
  },
  // AI dependency patterns
  aiDependencyPattern: {
    hintsBeforeSuccess: { type: Number, default: 0 }, // avg hints before solving
    successWithoutHints: { type: Number, default: 0 }, // count of activities solved without AI
    successWithHints: { type: Number, default: 0 }, // count solved with AI help
    avgHintLevelUsed: { type: Number, default: 0 },
    dependencyTrend: { // 'increasing', 'decreasing', 'stable'
      type: String,
      enum: ['increasing', 'decreasing', 'stable', 'unknown'],
      default: 'unknown'
    }
  },
  lastActivityDate: {
    type: Date
  },
  lastAnalyzedAt: {
    type: Date
  },
  // For competency decay tracking
  lastCompetencyDecayCheck: {
    type: Date,
    default: Date.now
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

// Method to update after activity completion (enhanced)
studentTwinSchema.methods.recordActivity = async function(passed, aiRequests = 0, difficulty = 'medium', hintsUsed = 0) {
  this.totalActivitiesAttempted += 1;
  if (passed) {
    this.totalActivitiesCompleted += 1;
  }
  this.totalAIRequests += aiRequests;
  this.lastActivityDate = new Date();

  // Track difficulty-based stats
  const diffKey = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
  if (!this.difficultyStats[diffKey]) {
    this.difficultyStats[diffKey] = { attempted: 0, completed: 0 };
  }
  this.difficultyStats[diffKey].attempted += 1;
  if (passed) {
    this.difficultyStats[diffKey].completed += 1;
  }

  // Track AI dependency patterns
  if (passed) {
    if (hintsUsed > 0) {
      this.aiDependencyPattern.successWithHints += 1;
      // Update average hints before success (running average)
      const prevTotal = this.aiDependencyPattern.hintsBeforeSuccess * (this.aiDependencyPattern.successWithHints - 1);
      this.aiDependencyPattern.hintsBeforeSuccess = (prevTotal + hintsUsed) / this.aiDependencyPattern.successWithHints;
    } else {
      this.aiDependencyPattern.successWithoutHints += 1;
    }
  }

  // Update AI dependency score (enhanced calculation)
  if (this.totalActivitiesAttempted > 0) {
    // Factor in both frequency and level of hints used
    const hintFrequency = this.totalAIRequests / (this.totalActivitiesAttempted * 3);
    const hintReliance = this.aiDependencyPattern.successWithHints /
      (this.aiDependencyPattern.successWithHints + this.aiDependencyPattern.successWithoutHints + 0.001);

    this.behavioralData.aiDependencyScore = Math.min(
      (hintFrequency * 0.4 + hintReliance * 0.6),
      1
    );
  }

  // Calculate and update learning velocity
  await this.updateLearningVelocity();

  return this.save();
};

// Calculate learning velocity based on recent performance
studentTwinSchema.methods.updateLearningVelocity = async function() {
  const StudentCompetency = mongoose.model('StudentCompetency');

  // Get all competencies
  const competencies = await StudentCompetency.find({ studentId: this.studentId });

  if (competencies.length === 0) {
    this.learningVelocity = 0;
    return;
  }

  // Calculate weighted average proficiency
  const avgProficiency = competencies.reduce((sum, c) => sum + c.proficiencyLevel, 0) / competencies.length;

  // Calculate success rate trend
  const successRate = this.totalActivitiesCompleted / (this.totalActivitiesAttempted || 1);

  // Difficulty-weighted success (harder = more velocity)
  const difficultyWeight = {
    easy: 0.5,
    medium: 1.0,
    hard: 1.5
  };

  let weightedSuccess = 0;
  let totalWeight = 0;

  for (const diff of ['easy', 'medium', 'hard']) {
    if (this.difficultyStats[diff] && this.difficultyStats[diff].attempted > 0) {
      const rate = this.difficultyStats[diff].completed / this.difficultyStats[diff].attempted;
      weightedSuccess += rate * difficultyWeight[diff] * this.difficultyStats[diff].attempted;
      totalWeight += difficultyWeight[diff] * this.difficultyStats[diff].attempted;
    }
  }

  const weightedSuccessRate = totalWeight > 0 ? weightedSuccess / totalWeight : successRate;

  // Factor in AI independence (less dependency = higher velocity)
  const aiIndependenceFactor = 1 - (this.behavioralData.aiDependencyScore * 0.3);

  // Calculate velocity (-100 to +100 scale)
  // Positive = improving, Negative = declining
  const previousVelocity = this.learningVelocity || 0;
  const currentPerformance = (avgProficiency * 40 + weightedSuccessRate * 40 + aiIndependenceFactor * 20);

  // Smooth velocity change
  this.learningVelocity = Math.round((previousVelocity * 0.3 + currentPerformance * 0.7) * 10) / 10;

  // Store velocity history (keep last 30 entries)
  if (!this.velocityHistory) this.velocityHistory = [];
  this.velocityHistory.push({
    date: new Date(),
    velocity: this.learningVelocity,
    activitiesCompleted: this.totalActivitiesCompleted
  });
  if (this.velocityHistory.length > 30) {
    this.velocityHistory = this.velocityHistory.slice(-30);
  }

  // Determine AI dependency trend
  if (this.velocityHistory.length >= 5) {
    const recent = this.velocityHistory.slice(-5);
    const older = this.velocityHistory.slice(-10, -5);

    if (older.length > 0) {
      const recentAvg = recent.reduce((s, v) => s + v.velocity, 0) / recent.length;
      const olderAvg = older.reduce((s, v) => s + v.velocity, 0) / older.length;

      if (recentAvg > olderAvg + 5) {
        this.aiDependencyPattern.dependencyTrend = 'decreasing'; // Getting more independent
      } else if (recentAvg < olderAvg - 5) {
        this.aiDependencyPattern.dependencyTrend = 'increasing'; // Getting more dependent
      } else {
        this.aiDependencyPattern.dependencyTrend = 'stable';
      }
    }
  }
};

// Method to update behavioral data from a submission (enhanced)
studentTwinSchema.methods.updateBehavioralData = async function(behavioralMetrics) {
  if (!behavioralMetrics) return this;

  const {
    typingSpeed = 0,
    averagePauseDuration = 0,
    pasteEvents = 0,
    sessionDuration = 0,
    activeTimePercentage = 100
  } = behavioralMetrics;

  // Running average for typing speed
  const currentAvg = this.behavioralData.avgTypingSpeed || 0;
  const count = this.totalActivitiesAttempted || 1;

  if (typingSpeed > 0) {
    // Weighted moving average (more recent data has more weight)
    this.behavioralData.avgTypingSpeed = Math.round(
      (currentAvg * (count - 1) + typingSpeed) / count
    );
  }

  // Running average for pause duration
  const currentPauseAvg = this.behavioralData.avgThinkingPause || 0;
  if (averagePauseDuration > 0) {
    this.behavioralData.avgThinkingPause = Math.round(
      ((currentPauseAvg * (count - 1) + averagePauseDuration) / count) * 10
    ) / 10;
  }

  // Track paste events frequency
  const currentPasteFreq = this.behavioralData.avgPasteFrequency || 0;
  this.behavioralData.avgPasteFrequency = Math.round(
    ((currentPasteFreq * (count - 1) + pasteEvents) / count) * 10
  ) / 10;

  // Track error frequency (compilation/runtime errors tracked elsewhere)
  if (pasteEvents > 0) {
    const currentErrorFreq = this.behavioralData.errorFrequency || 0;
    this.behavioralData.errorFrequency = Math.round(
      ((currentErrorFreq * (count - 1) + pasteEvents) / count) * 10
    ) / 10;
  }

  // Update average active time percentage
  const currentActiveAvg = this.behavioralData.avgActiveTimePercentage || 100;
  this.behavioralData.avgActiveTimePercentage = Math.round(
    ((currentActiveAvg * (count - 1) + activeTimePercentage) / count)
  );

  // Update average time per problem (in minutes)
  if (sessionDuration > 0) {
    const sessionMinutes = sessionDuration / 60;
    const currentAvgTime = this.averageTimePerProblem || 0;
    this.averageTimePerProblem = Math.round(
      ((currentAvgTime * (count - 1) + sessionMinutes) / count) * 10
    ) / 10;
  }

  return this.save();
};

// Update code revision metrics from snapshot analysis
studentTwinSchema.methods.updateCodeRevisionMetrics = async function(revisionAnalysis) {
  if (!revisionAnalysis) return this;

  const count = this.totalActivitiesAttempted || 1;

  // Update running averages
  const current = this.codeRevisionMetrics;

  this.codeRevisionMetrics.avgRevisionsPerActivity = Math.round(
    ((current.avgRevisionsPerActivity * (count - 1) + revisionAnalysis.totalSnapshots) / count) * 10
  ) / 10;

  this.codeRevisionMetrics.avgLinesAddedPerSession = Math.round(
    ((current.avgLinesAddedPerSession * (count - 1) + revisionAnalysis.totalLinesAdded) / count) * 10
  ) / 10;

  this.codeRevisionMetrics.avgLinesModifiedPerSession = Math.round(
    ((current.avgLinesModifiedPerSession * (count - 1) + revisionAnalysis.totalLinesModified) / count) * 10
  ) / 10;

  // Update coding pattern type based on analysis
  if (revisionAnalysis.codingPattern && revisionAnalysis.codingPattern !== 'insufficient_data') {
    this.behavioralData.codingPatternType = revisionAnalysis.codingPattern;
  }

  // Determine preferred coding style
  if (revisionAnalysis.totalSnapshots >= 3) {
    const addToModifyRatio = revisionAnalysis.totalLinesAdded / (revisionAnalysis.totalLinesModified || 1);

    if (addToModifyRatio > 3) {
      this.codeRevisionMetrics.preferredCodingStyle = 'write_then_debug';
    } else if (this.behavioralData.avgPasteFrequency > 2) {
      this.codeRevisionMetrics.preferredCodingStyle = 'copy_modify';
    } else if (revisionAnalysis.revisionFrequency > 1) {
      this.codeRevisionMetrics.preferredCodingStyle = 'incremental';
    }
  }

  return this.save();
};

// Mark hint as successful (led to passing)
studentTwinSchema.methods.recordSuccessfulHint = async function() {
  this.totalHintsSuccessful += 1;
  return this.save();
};

// Get comprehensive twin analysis
studentTwinSchema.methods.getFullAnalysis = async function() {
  const StudentCompetency = mongoose.model('StudentCompetency');

  // Get competencies
  const competencies = await StudentCompetency.find({ studentId: this.studentId });

  // Calculate overall proficiency
  const avgProficiency = competencies.length > 0
    ? competencies.reduce((sum, c) => sum + c.proficiencyLevel, 0) / competencies.length
    : 0;

  // Calculate success rate
  const overallSuccessRate = this.totalActivitiesAttempted > 0
    ? (this.totalActivitiesCompleted / this.totalActivitiesAttempted) * 100
    : 0;

  // Determine learning phase
  let learningPhase = 'beginner';
  if (this.totalActivitiesCompleted >= 20 && avgProficiency > 0.7) {
    learningPhase = 'advanced';
  } else if (this.totalActivitiesCompleted >= 10 && avgProficiency > 0.4) {
    learningPhase = 'intermediate';
  } else if (this.totalActivitiesCompleted >= 3) {
    learningPhase = 'developing';
  }

  // Determine AI independence level
  let aiIndependence = 'low';
  if (this.behavioralData.aiDependencyScore < 0.2) {
    aiIndependence = 'high';
  } else if (this.behavioralData.aiDependencyScore < 0.5) {
    aiIndependence = 'moderate';
  }

  // Calculate hint effectiveness
  const hintEffectiveness = this.totalAIRequests > 0
    ? (this.totalHintsSuccessful / this.totalAIRequests) * 100
    : 0;

  return {
    studentId: this.studentId,
    learningPhase,
    avgProficiency: Math.round(avgProficiency * 100),
    overallSuccessRate: Math.round(overallSuccessRate),
    learningVelocity: this.learningVelocity,
    velocityTrend: this.velocityHistory.length >= 2
      ? (this.velocityHistory[this.velocityHistory.length - 1].velocity >
         this.velocityHistory[this.velocityHistory.length - 2].velocity ? 'improving' : 'declining')
      : 'stable',
    behavioral: {
      avgTypingSpeed: this.behavioralData.avgTypingSpeed,
      avgThinkingPause: this.behavioralData.avgThinkingPause,
      avgActiveTime: this.behavioralData.avgActiveTimePercentage,
      codingStyle: this.codeRevisionMetrics.preferredCodingStyle,
      codingPattern: this.behavioralData.codingPatternType
    },
    aiDependency: {
      score: Math.round(this.behavioralData.aiDependencyScore * 100),
      independence: aiIndependence,
      trend: this.aiDependencyPattern.dependencyTrend,
      hintsBeforeSuccess: Math.round(this.aiDependencyPattern.hintsBeforeSuccess * 10) / 10,
      hintEffectiveness: Math.round(hintEffectiveness)
    },
    difficultyProgress: {
      easy: this.difficultyStats.easy,
      medium: this.difficultyStats.medium,
      hard: this.difficultyStats.hard
    },
    strengths: this.strengths,
    weaknesses: this.weaknesses,
    recommendedTopics: this.recommendedTopics,
    totalActivities: {
      attempted: this.totalActivitiesAttempted,
      completed: this.totalActivitiesCompleted
    },
    lastActivity: this.lastActivityDate,
    competencies: competencies.map(c => ({
      topic: c.topic,
      proficiency: Math.round(c.proficiencyLevel * 100),
      successRate: c.successRate,
      attempts: c.totalAttempts
    }))
  };
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
