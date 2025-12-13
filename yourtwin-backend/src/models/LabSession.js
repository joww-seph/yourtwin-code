import mongoose from 'mongoose';

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
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
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
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isActive: {
    type: Boolean,
    default: true
  },
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

// Index for querying
labSessionSchema.index({ instructor: 1, scheduledDate: -1 });
labSessionSchema.index({ course: 1, yearLevel: 1, section: 1 });
labSessionSchema.index({ status: 1, scheduledDate: 1 });

const LabSession = mongoose.model('LabSession', labSessionSchema);

export default LabSession;