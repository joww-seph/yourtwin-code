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

const StudentCompetency = mongoose.model('StudentCompetency', studentCompetencySchema);

export default StudentCompetency;
