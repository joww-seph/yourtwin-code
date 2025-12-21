import mongoose from 'mongoose';

/**
 * SessionEnrollment Model - Junction Table (BCNF Compliant)
 * Links students to lab sessions.
 * Enforces invariant: student's course/year/section must match session's.
 */
const sessionEnrollmentSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabSession',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate enrollments
sessionEnrollmentSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

// Index for quick lookups
sessionEnrollmentSchema.index({ sessionId: 1 });
sessionEnrollmentSchema.index({ studentId: 1 });

// Pre-save hook to enforce invariant: student must match session's course/year/section
sessionEnrollmentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const LabSession = mongoose.model('LabSession');
    const Student = mongoose.model('Student');

    const [session, student] = await Promise.all([
      LabSession.findById(this.sessionId),
      Student.findById(this.studentId)
    ]);

    if (!session) {
      throw new Error('Lab session not found');
    }

    if (!student) {
      throw new Error('Student not found');
    }

    // Enforce course/year/section match
    if (student.course !== session.course ||
        student.yearLevel !== session.yearLevel ||
        student.section !== session.section) {
      throw new Error(
        `Student (${student.course} ${student.yearLevel}-${student.section}) ` +
        `does not match session target (${session.course} ${session.yearLevel}-${session.section})`
      );
    }
  }

  next();
});

// Static method to enroll multiple students
sessionEnrollmentSchema.statics.enrollStudents = async function(sessionId, studentIds) {
  const enrollments = studentIds.map(studentId => ({
    sessionId,
    studentId
  }));

  // Use insertMany with ordered: false to continue on duplicates
  try {
    return await this.insertMany(enrollments, { ordered: false });
  } catch (error) {
    // If some failed due to duplicates, that's okay
    if (error.code === 11000) {
      console.log('Some students were already enrolled');
    } else {
      throw error;
    }
  }
};

// Static method to get all students enrolled in a session
sessionEnrollmentSchema.statics.getEnrolledStudents = async function(sessionId) {
  const enrollments = await this.find({ sessionId })
    .populate({
      path: 'studentId',
      populate: { path: 'userId' }
    });

  return enrollments.map(e => e.studentId);
};

// Static method to get all sessions a student is enrolled in
sessionEnrollmentSchema.statics.getStudentSessions = async function(studentId) {
  const enrollments = await this.find({ studentId })
    .populate('sessionId');

  return enrollments.map(e => e.sessionId);
};

// Static method to unenroll a student from a session
sessionEnrollmentSchema.statics.unenrollStudent = async function(sessionId, studentId) {
  return await this.findOneAndDelete({ sessionId, studentId });
};

// Static method to check if a student is enrolled in a session
sessionEnrollmentSchema.statics.isEnrolled = async function(sessionId, studentId) {
  const enrollment = await this.findOne({ sessionId, studentId });
  return !!enrollment;
};

const SessionEnrollment = mongoose.model('SessionEnrollment', sessionEnrollmentSchema);

export default SessionEnrollment;
