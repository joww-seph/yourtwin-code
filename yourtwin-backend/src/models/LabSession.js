import mongoose from 'mongoose';

/**
 * LabSession Model (BCNF with Conscious Denormalization)
 *
 * DENORMALIZED FIELDS (with justification):
 * - course, yearLevel, section: Derived from enrolled students via SessionEnrollment
 *   Justification: Frequently queried for filtering, avoids expensive joins
 *   Invariant: All enrolled students must match these values (enforced by SessionEnrollment)
 */
const labSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Target audience for this session
  course: {
    type: String,
    enum: ['BSIT', 'BSCS', 'BSIS', 'ACT'],
    required: true
  },
  yearLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  // Multiple sections can access a single lab session
  sections: [{
    type: String,
    uppercase: true,
    trim: true
  }],
  // Programming language for all activities in this session
  language: {
    type: String,
    enum: ['c', 'cpp', 'java', 'python'],
    required: [true, 'Programming language is required'],
    default: 'python'
  },
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true // Format: "14:00"
  },
  endTime: {
    type: String,
    required: true // Format: "17:00"
  },
  // Extended end time (for when instructor extends the session)
  extendedEndTime: {
    type: String,
    default: null // Format: "18:00" - if set, overrides endTime
  },
  room: {
    type: String,
    trim: true
  },
  // Session is active when instructor enables it
  isActive: {
    type: Boolean,
    default: true // Sessions are active by default
  },
  // Manually marked as complete by instructor
  isCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for activities (fetched from Activity collection)
labSessionSchema.virtual('activities', {
  ref: 'Activity',
  localField: '_id',
  foreignField: 'labSession'
});

// Virtual for enrollments (fetched from SessionEnrollment collection)
labSessionSchema.virtual('enrollments', {
  ref: 'SessionEnrollment',
  localField: '_id',
  foreignField: 'sessionId'
});

// Get effective end time (considers extensions)
labSessionSchema.methods.getEffectiveEndTime = function() {
  return this.extendedEndTime || this.endTime;
};

// Mark session as complete
labSessionSchema.methods.markAsComplete = function() {
  this.isCompleted = true;
  this.isActive = false;
  return this.save();
};

// Reopen a completed session
labSessionSchema.methods.reopen = function() {
  this.isCompleted = false;
  this.isActive = true;
  return this.save();
};

// Ensure virtuals are included in JSON
labSessionSchema.set('toJSON', { virtuals: true });
labSessionSchema.set('toObject', { virtuals: true });

// Indexes for querying
labSessionSchema.index({ instructor: 1, scheduledDate: -1 });
labSessionSchema.index({ course: 1, yearLevel: 1 });
labSessionSchema.index({ isActive: 1, isCompleted: 1 });

const LabSession = mongoose.model('LabSession', labSessionSchema);

export default LabSession;
