import mongoose from 'mongoose';

/**
 * Instructor Model - Instructor-specific data (BCNF Compliant)
 * References User for base identity.
 * Contains employment information specific to instructors.
 */
const instructorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  department: {
    type: String,
    default: 'CCIS',
    trim: true
  }
}, {
  timestamps: true
});

// Virtual to get full instructor info with user data
instructorSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON
instructorSchema.set('toJSON', { virtuals: true });
instructorSchema.set('toObject', { virtuals: true });

// Indexes (userId and employeeId already have unique: true which creates indexes)
instructorSchema.index({ department: 1 });

// Static method to find instructor by userId
instructorSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId');
};

const Instructor = mongoose.model('Instructor', instructorSchema);

export default Instructor;
