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
  // DENORMALIZED: Course/Year/Section from enrolled students
  // These define the target audience and are used for filtering
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
  section: {
    type: String,
    required: true,
    uppercase: true
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
  room: {
    type: String,
    trim: true
  },
  // Status flags
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isActive: {
    type: Boolean,
    default: false // Sessions start inactive until instructor activates
  },
  // Late submission settings
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  lateSubmissionDeadline: {
    type: Date
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

// Ensure virtuals are included in JSON
labSessionSchema.set('toJSON', { virtuals: true });
labSessionSchema.set('toObject', { virtuals: true });

// Indexes for querying
labSessionSchema.index({ instructor: 1, scheduledDate: -1 });
labSessionSchema.index({ course: 1, yearLevel: 1, section: 1 });
labSessionSchema.index({ status: 1, scheduledDate: 1 });
labSessionSchema.index({ isActive: 1 });

const LabSession = mongoose.model('LabSession', labSessionSchema);

export default LabSession;
