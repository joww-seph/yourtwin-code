import mongoose from 'mongoose';

/**
 * StudentCompetency Model (BCNF Compliant)
 * Tracks individual topic proficiency for each student.
 * Separate from StudentTwin for independent updates.
 */
const studentCompetencySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  topic: {
    type: String,
    required: true,
    trim: true
  },
  proficiencyLevel: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  successRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  successfulAttempts: {
    type: Number,
    default: 0
  },
  lastAttemptAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound unique index to ensure one competency per student per topic
studentCompetencySchema.index({ studentId: 1, topic: 1 }, { unique: true });

// Index for querying
studentCompetencySchema.index({ studentId: 1 });
studentCompetencySchema.index({ topic: 1 });

// Static method to get all competencies for a student
studentCompetencySchema.statics.getByStudent = function(studentId) {
  return this.find({ studentId }).sort({ topic: 1 });
};

// Static method to get or create a competency
studentCompetencySchema.statics.getOrCreate = async function(studentId, topic) {
  let competency = await this.findOne({ studentId, topic });

  if (!competency) {
    competency = await this.create({
      studentId,
      topic,
      proficiencyLevel: 0,
      successRate: 0,
      totalAttempts: 0,
      successfulAttempts: 0
    });
  }

  return competency;
};

// Static method to update competency after a submission
studentCompetencySchema.statics.updateFromSubmission = async function(studentId, topic, passed) {
  const competency = await this.getOrCreate(studentId, topic);

  competency.totalAttempts += 1;
  if (passed) {
    competency.successfulAttempts += 1;
  }

  // Calculate success rate
  competency.successRate = Math.round(
    (competency.successfulAttempts / competency.totalAttempts) * 100
  );

  // Calculate proficiency level (normalized 0-1)
  // Uses a weighted formula: more recent success has more impact
  const baseLevel = competency.successRate / 100;
  const attemptFactor = Math.min(competency.totalAttempts / 10, 1); // Max out at 10 attempts
  competency.proficiencyLevel = baseLevel * (0.5 + 0.5 * attemptFactor);

  competency.lastAttemptAt = new Date();

  await competency.save();
  return competency;
};

// Static method to get top competencies for a student
studentCompetencySchema.statics.getStrengths = function(studentId, limit = 3) {
  return this.find({ studentId, totalAttempts: { $gte: 3 } })
    .sort({ proficiencyLevel: -1 })
    .limit(limit);
};

// Static method to get weak areas for a student
studentCompetencySchema.statics.getWeaknesses = function(studentId, limit = 3) {
  return this.find({ studentId, totalAttempts: { $gte: 3 } })
    .sort({ proficiencyLevel: 1 })
    .limit(limit);
};

/**
 * Apply competency decay based on time since last practice
 * Competencies decay if not practiced for extended periods
 */
studentCompetencySchema.methods.applyDecay = async function() {
  if (!this.lastAttemptAt) return this;

  const now = new Date();
  const daysSinceLastAttempt = (now - this.lastAttemptAt) / (1000 * 60 * 60 * 24);

  // Decay settings
  const DECAY_START_DAYS = 7; // Start decaying after 7 days of no practice
  const DECAY_RATE = 0.02; // 2% decay per day after threshold
  const MIN_PROFICIENCY = 0.1; // Never decay below 10%

  if (daysSinceLastAttempt > DECAY_START_DAYS) {
    const daysOfDecay = daysSinceLastAttempt - DECAY_START_DAYS;
    const decayFactor = Math.pow(1 - DECAY_RATE, daysOfDecay);

    const newProficiency = this.proficiencyLevel * decayFactor;
    this.proficiencyLevel = Math.max(newProficiency, MIN_PROFICIENCY);

    await this.save();
  }

  return this;
};

/**
 * Apply decay to all competencies for a student
 */
studentCompetencySchema.statics.applyDecayForStudent = async function(studentId) {
  const competencies = await this.find({ studentId });
  const decayPromises = competencies.map(c => c.applyDecay());
  return Promise.all(decayPromises);
};

/**
 * Enhanced update with difficulty weighting
 */
studentCompetencySchema.statics.updateFromSubmissionWithDifficulty = async function(
  studentId,
  topic,
  passed,
  difficulty = 'medium'
) {
  const competency = await this.getOrCreate(studentId, topic);

  // Difficulty multipliers
  const difficultyWeights = {
    easy: 0.5,
    medium: 1.0,
    hard: 1.5
  };
  const weight = difficultyWeights[difficulty] || 1.0;

  competency.totalAttempts += 1;
  if (passed) {
    // Weight successful attempts by difficulty
    competency.successfulAttempts += weight;
  }

  // Calculate weighted success rate
  const weightedTotal = competency.totalAttempts; // Could also weight attempts
  competency.successRate = Math.min(100, Math.round(
    (competency.successfulAttempts / weightedTotal) * 100
  ));

  // Enhanced proficiency calculation with difficulty consideration
  const baseLevel = competency.successRate / 100;
  const attemptFactor = Math.min(competency.totalAttempts / 10, 1);

  // Bonus for completing harder problems
  const difficultyBonus = passed ? (weight - 1) * 0.05 : 0;

  competency.proficiencyLevel = Math.min(1, baseLevel * (0.5 + 0.5 * attemptFactor) + difficultyBonus);

  competency.lastAttemptAt = new Date();

  await competency.save();
  return competency;
};

/**
 * Get competency summary for a student
 */
studentCompetencySchema.statics.getSummary = async function(studentId) {
  const competencies = await this.find({ studentId });

  if (competencies.length === 0) {
    return {
      totalTopics: 0,
      avgProficiency: 0,
      avgSuccessRate: 0,
      strongestTopic: null,
      weakestTopic: null,
      needsReview: []
    };
  }

  const avgProficiency = competencies.reduce((sum, c) => sum + c.proficiencyLevel, 0) / competencies.length;
  const avgSuccessRate = competencies.reduce((sum, c) => sum + c.successRate, 0) / competencies.length;

  // Sort by proficiency
  const sorted = [...competencies].sort((a, b) => b.proficiencyLevel - a.proficiencyLevel);

  // Topics needing review (low proficiency or not practiced recently)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const needsReview = competencies
    .filter(c => c.proficiencyLevel < 0.5 || (c.lastAttemptAt && c.lastAttemptAt < oneWeekAgo))
    .map(c => ({
      topic: c.topic,
      proficiency: Math.round(c.proficiencyLevel * 100),
      daysSinceLastAttempt: c.lastAttemptAt
        ? Math.round((Date.now() - c.lastAttemptAt) / (1000 * 60 * 60 * 24))
        : null
    }));

  return {
    totalTopics: competencies.length,
    avgProficiency: Math.round(avgProficiency * 100),
    avgSuccessRate: Math.round(avgSuccessRate),
    strongestTopic: sorted[0] ? {
      topic: sorted[0].topic,
      proficiency: Math.round(sorted[0].proficiencyLevel * 100)
    } : null,
    weakestTopic: sorted[sorted.length - 1] ? {
      topic: sorted[sorted.length - 1].topic,
      proficiency: Math.round(sorted[sorted.length - 1].proficiencyLevel * 100)
    } : null,
    needsReview
  };
};

const StudentCompetency = mongoose.model('StudentCompetency', studentCompetencySchema);

export default StudentCompetency;
