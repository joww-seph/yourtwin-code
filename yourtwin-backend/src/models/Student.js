import mongoose from 'mongoose';

/**
 * Student Model - Student-specific data (BCNF Compliant)
 * References User for base identity.
 * Contains academic information specific to students.
 */
const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true
  },
  course: {
    type: String,
    enum: ['BSIT', 'BSCS', 'BSIS', 'ACT'],
    required: [true, 'Course is required'],
    uppercase: true
  },
  yearLevel: {
    type: Number,
    required: [true, 'Year level is required'],
    min: 1,
    max: 4
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    uppercase: true,
    trim: true
  }
}, {
  timestamps: true
});

// Virtual to get full student info with user data
studentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

// Indexes for common queries
// Note: userId and studentId already have unique: true which creates indexes
studentSchema.index({ course: 1, yearLevel: 1, section: 1 });

// Static method to find student by userId
studentSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId');
};

// Static method to find students by course/year/section
studentSchema.statics.findByCourseYearSection = function(course, yearLevel, section) {
  return this.find({ course, yearLevel, section }).populate('userId');
};

const Student = mongoose.model('Student', studentSchema);

export default Student;
