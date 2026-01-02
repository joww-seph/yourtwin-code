import LabSession from '../models/LabSession.js';
import Activity from '../models/Activity.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import SessionEnrollment from '../models/SessionEnrollment.js';
import TestCase from '../models/TestCase.js';
import Submission from '../models/Submission.js';
import HintRequest from '../models/HintRequest.js';
import { emitToLabSession, emitToAllStudents, emitToAllInstructors, emitToUsers } from '../utils/socket.js';

// Helper function to get enrolled students with user info
async function getEnrolledStudentsWithUserInfo(sessionId) {
  const enrollments = await SessionEnrollment.find({ sessionId })
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'firstName lastName email' }
    });

  return enrollments
    .filter(e => e.studentId && e.studentId.userId) // Filter out null/deleted references
    .map(e => {
      const student = e.studentId;
      const user = student.userId;
      return {
        _id: student._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        studentId: student.studentId,
        course: student.course,
        section: student.section,
        yearLevel: student.yearLevel,
        enrolledAt: e.enrolledAt
      };
    });
}

// Helper to get activities with test cases
async function getSessionActivities(sessionId) {
  const activities = await Activity.find({ labSession: sessionId, isActive: true })
    .populate('testCases')
    .sort({ orderInSession: 1 });
  // Filter out any null/undefined activities
  return activities.filter(a => a != null);
}

// @desc    Create lab session
// @route   POST /api/lab-sessions
export const createLabSession = async (req, res) => {
  try {
    const { studentIds, ...sessionData } = req.body;

    const labSession = await LabSession.create({
      ...sessionData,
      instructor: req.user._id
    });

    // Enroll students if provided
    if (studentIds && studentIds.length > 0) {
      await SessionEnrollment.enrollStudents(labSession._id, studentIds);
    }

    await labSession.populate('instructor', 'firstName lastName fullName email');

    // Get enrolled students
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);

    // Get activities
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    // Emit real-time update
    console.log(`📡 [Socket] Lab session created: ${labSession.title}`);
    emitToAllInstructors('lab-session-created', {
      sessionId: labSession._id,
      session: responseData
    });

    if (labSession.isActive && enrolledStudents.length > 0) {
      const studentUserIds = await Promise.all(
        enrolledStudents.map(async s => {
          const student = await Student.findById(s._id);
          return student.userId;
        })
      );
      emitToUsers(studentUserIds, 'lab-session-created', {
        sessionId: labSession._id,
        session: responseData
      });
    }

    res.status(201).json({
      success: true,
      message: 'Lab session created successfully',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create lab session',
      error: error.message
    });
  }
};

// @desc    Get all lab sessions
// @route   GET /api/lab-sessions
export const getLabSessions = async (req, res) => {
  try {
    const { status, course, yearLevel, section } = req.query;
    const filter = {};

    // Filter by instructor for instructors
    if (req.user.role === 'instructor') {
      filter.instructor = req.user._id;
    }

    // For students, get their enrolled sessions
    if (req.user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: req.user._id });
      if (!studentProfile) {
        return res.json({ success: true, count: 0, data: [] });
      }

      const enrollments = await SessionEnrollment.find({ studentId: studentProfile._id });
      const sessionIds = enrollments.map(e => e.sessionId);
      filter._id = { $in: sessionIds };
      filter.isActive = true;
    }

    if (status) filter.status = status;
    if (course) filter.course = course;
    if (yearLevel) filter.yearLevel = parseInt(yearLevel);
    if (section) filter.section = section.toUpperCase();

    const labSessions = await LabSession.find(filter)
      .populate('instructor', 'firstName lastName fullName email')
      .sort({ scheduledDate: -1 });

    // Enrich with enrolled students and activities
    const enrichedSessions = await Promise.all(
      labSessions.map(async (session) => {
        const enrolledStudents = await getEnrolledStudentsWithUserInfo(session._id);
        const activities = await getSessionActivities(session._id);
        return {
          ...session.toObject(),
          allowedStudents: enrolledStudents,
          activities
        };
      })
    );

    res.json({
      success: true,
      count: enrichedSessions.length,
      data: enrichedSessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab sessions',
      error: error.message
    });
  }
};

// @desc    Get single lab session
// @route   GET /api/lab-sessions/:id
export const getLabSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id)
      .populate('instructor', 'firstName lastName fullName email');

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    // Check access based on role
    if (req.user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: req.user._id });
      if (!studentProfile) {
        return res.status(403).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      const isEnrolled = await SessionEnrollment.isEnrolled(labSession._id, studentProfile._id);
      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this session'
        });
      }

      if (!labSession.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This session is not active'
        });
      }
    } else if (req.user.role === 'instructor') {
      const sessionInstructorId = labSession.instructor._id
        ? labSession.instructor._id.toString()
        : labSession.instructor.toString();

      if (sessionInstructorId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own sessions'
        });
      }
    }

    // Get enrolled students and activities
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    res.json({
      success: true,
      data: {
        ...labSession.toObject(),
        allowedStudents: enrolledStudents,
        activities
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lab session',
      error: error.message
    });
  }
};

// @desc    Update lab session
// @route   PUT /api/lab-sessions/:id
export const updateLabSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session'
      });
    }

    const updatedSession = await LabSession.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('instructor', 'firstName lastName fullName email');

    const enrolledStudents = await getEnrolledStudentsWithUserInfo(updatedSession._id);
    const activities = await getSessionActivities(updatedSession._id);

    const responseData = {
      ...updatedSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    console.log(`📡 [Socket] Lab session updated: ${updatedSession.title}`);
    emitToAllStudents('lab-session-updated', {
      sessionId: updatedSession._id,
      session: responseData
    });
    emitToAllInstructors('lab-session-updated', {
      sessionId: updatedSession._id,
      session: responseData
    });

    res.json({
      success: true,
      message: 'Lab session updated successfully',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update lab session',
      error: error.message
    });
  }
};

// @desc    Delete lab session
// @route   DELETE /api/lab-sessions/:id
export const deleteLabSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session'
      });
    }

    const sessionId = labSession._id;

    // Delete associated test cases for activities
    const activities = await Activity.find({ labSession: sessionId });
    for (const activity of activities) {
      await TestCase.deleteMany({ activityId: activity._id });
    }

    // Delete activities
    await Activity.deleteMany({ labSession: sessionId });

    // Delete enrollments
    await SessionEnrollment.deleteMany({ sessionId });

    // Delete the lab session
    await LabSession.findByIdAndDelete(sessionId);

    console.log(`📡 [Socket] Lab session deleted: ${labSession.title}`);
    emitToAllStudents('lab-session-deleted', { sessionId });
    emitToAllInstructors('lab-session-deleted', { sessionId });

    res.json({
      success: true,
      message: 'Lab session deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete lab session',
      error: error.message
    });
  }
};

// @desc    Activate lab session
// @route   PUT /api/lab-sessions/:id/activate
export const activateLabSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to activate this session'
      });
    }

    labSession.isActive = true;
    labSession.isCompleted = false;
    await labSession.save();

    await labSession.populate('instructor', 'firstName lastName fullName email');

    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    emitToLabSession(labSession._id, 'lab-session-updated', {
      sessionId: labSession._id,
      isActive: true,
      session: responseData
    });
    emitToAllStudents('lab-session-activated', {
      sessionId: labSession._id,
      session: responseData
    });

    res.json({
      success: true,
      message: 'Lab session activated successfully',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to activate lab session',
      error: error.message
    });
  }
};

// @desc    Deactivate lab session
// @route   PUT /api/lab-sessions/:id/deactivate
export const deactivateLabSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to deactivate this session'
      });
    }

    labSession.isActive = false;
    await labSession.save();

    await labSession.populate('instructor', 'firstName lastName fullName email');

    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    emitToLabSession(labSession._id, 'lab-session-updated', {
      sessionId: labSession._id,
      isActive: false,
      session: responseData
    });
    emitToAllStudents('lab-session-deactivated', {
      sessionId: labSession._id,
      session: responseData
    });

    res.json({
      success: true,
      message: 'Lab session deactivated successfully',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate lab session',
      error: error.message
    });
  }
};

// @desc    Mark lab session as complete
// @route   PUT /api/lab-sessions/:id/complete
export const markSessionComplete = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this session'
      });
    }

    labSession.isCompleted = true;
    labSession.isActive = false;
    await labSession.save();

    await labSession.populate('instructor', 'firstName lastName fullName email');

    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    emitToLabSession(labSession._id, 'lab-session-updated', {
      sessionId: labSession._id,
      isCompleted: true,
      session: responseData
    });
    emitToAllStudents('lab-session-completed', {
      sessionId: labSession._id,
      session: responseData
    });

    res.json({
      success: true,
      message: 'Lab session marked as complete',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete lab session',
      error: error.message
    });
  }
};

// @desc    Reopen a completed lab session
// @route   PUT /api/lab-sessions/:id/reopen
export const reopenSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reopen this session'
      });
    }

    labSession.isCompleted = false;
    labSession.isActive = true;
    await labSession.save();

    await labSession.populate('instructor', 'firstName lastName fullName email');

    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    emitToLabSession(labSession._id, 'lab-session-updated', {
      sessionId: labSession._id,
      isCompleted: false,
      isActive: true,
      session: responseData
    });
    emitToAllStudents('lab-session-activated', {
      sessionId: labSession._id,
      session: responseData
    });

    res.json({
      success: true,
      message: 'Lab session reopened',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reopen lab session',
      error: error.message
    });
  }
};

// @desc    Get available students for adding to session
// @route   GET /api/lab-sessions/:id/available-students
export const getAvailableStudents = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { q, course, yearLevel, section } = req.query;

    // Build filter for students
    const studentFilter = {};
    if (course) studentFilter.course = course.toUpperCase();
    if (yearLevel) studentFilter.yearLevel = parseInt(yearLevel);
    if (section) studentFilter.section = section.toUpperCase();

    // Find students matching filter
    let students = await Student.find(studentFilter).populate('userId', 'firstName lastName email');

    // Filter by search query
    if (q) {
      const regex = new RegExp(q, 'i');
      students = students.filter(s =>
        regex.test(s.userId.firstName) ||
        regex.test(s.userId.lastName) ||
        regex.test(s.studentId)
      );
    }

    // Get currently enrolled student IDs
    const enrollments = await SessionEnrollment.find({ sessionId: labSession._id });
    const enrolledStudentIds = enrollments.map(e => e.studentId.toString());

    // Mark which students are already in the session
    const studentsWithStatus = students.map(student => ({
      _id: student._id,
      firstName: student.userId.firstName,
      lastName: student.userId.lastName,
      email: student.userId.email,
      studentId: student.studentId,
      course: student.course,
      section: student.section,
      yearLevel: student.yearLevel,
      isInSession: enrolledStudentIds.includes(student._id.toString())
    }));

    res.json({
      success: true,
      count: studentsWithStatus.length,
      data: studentsWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available students',
      error: error.message
    });
  }
};

// @desc    Add students to lab session
// @route   POST /api/lab-sessions/:id/students
export const addStudentsToSession = async (req, res) => {
  try {
    const { studentIds, bulkFilter } = req.body;
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add students'
      });
    }

    let studentsToAdd = [];

    if (bulkFilter) {
      // Find students matching session's course/year/section (enforced by schema)
      const filter = {
        course: labSession.course,
        yearLevel: labSession.yearLevel,
        section: labSession.section
      };
      studentsToAdd = await Student.find(filter).select('_id');
    } else if (studentIds && Array.isArray(studentIds)) {
      // Get full student info to validate and report errors
      studentsToAdd = await Student.find({ _id: { $in: studentIds } }).populate('userId', 'firstName lastName');
    }

    // Enroll students and track failures
    let addedCount = 0;
    const failures = [];

    for (const student of studentsToAdd) {
      try {
        await SessionEnrollment.create({
          sessionId: labSession._id,
          studentId: student._id
        });
        addedCount++;
      } catch (err) {
        if (err.code === 11000) {
          // Already enrolled - not a real failure
          failures.push({
            studentId: student._id,
            name: student.userId ? `${student.userId.firstName} ${student.userId.lastName}` : student.studentId,
            reason: 'Already enrolled in this session'
          });
        } else {
          // Validation error (course/year/section mismatch)
          const studentName = student.userId ? `${student.userId.firstName} ${student.userId.lastName}` : student.studentId;
          console.error(`Failed to enroll student ${studentName}:`, err.message);
          failures.push({
            studentId: student._id,
            name: studentName,
            reason: err.message
          });
        }
      }
    }

    // Get updated data
    await labSession.populate('instructor', 'firstName lastName fullName email');
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    // Only emit socket events if students were actually added
    if (addedCount > 0) {
      console.log(`📡 [Socket] ${addedCount} student(s) added to session ${labSession._id}`);
      emitToAllStudents('lab-session-updated', {
        sessionId: labSession._id,
        session: responseData
      });
      emitToAllInstructors('lab-session-updated', {
        sessionId: labSession._id,
        session: responseData
      });
    }

    // Build response message
    let message = '';
    if (addedCount > 0 && failures.length === 0) {
      message = `${addedCount} student(s) added successfully`;
    } else if (addedCount > 0 && failures.length > 0) {
      message = `${addedCount} student(s) added. ${failures.length} failed.`;
    } else if (failures.length > 0) {
      // All failed
      const reasons = [...new Set(failures.map(f => f.reason))];
      message = `Failed to add students: ${reasons.join('; ')}`;
    } else {
      message = 'No students to add';
    }

    // Return error status if all students failed to enroll
    if (addedCount === 0 && failures.length > 0) {
      return res.status(400).json({
        success: false,
        message,
        data: {
          session: responseData,
          addedCount: 0,
          failures
        }
      });
    }

    res.json({
      success: true,
      message,
      data: {
        session: responseData,
        addedCount,
        failures: failures.length > 0 ? failures : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add students',
      error: error.message
    });
  }
};

// @desc    Remove student from lab session
// @route   DELETE /api/lab-sessions/:id/students/:studentId
export const removeStudentFromSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove students'
      });
    }

    await SessionEnrollment.unenrollStudent(labSession._id, req.params.studentId);

    await labSession.populate('instructor', 'firstName lastName fullName email');
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    // Emit to both students and instructors for real-time updates
    console.log(`📡 [Socket] Student removed from session ${labSession._id}`);
    emitToAllStudents('lab-session-updated', {
      sessionId: labSession._id,
      session: responseData
    });
    emitToAllInstructors('lab-session-updated', {
      sessionId: labSession._id,
      session: responseData
    });

    res.json({
      success: true,
      message: 'Student removed from session',
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove student',
      error: error.message
    });
  }
};

// @desc    Add activity to lab session (legacy - now use activity routes)
// @route   POST /api/lab-sessions/:id/activities
export const addActivityToSession = async (req, res) => {
  try {
    const { activityId } = req.body;
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Update activity's labSession reference
    activity.labSession = labSession._id;
    const activitiesCount = await Activity.countDocuments({ labSession: labSession._id });
    activity.orderInSession = activitiesCount + 1;
    await activity.save();

    const activities = await getSessionActivities(labSession._id);

    res.json({
      success: true,
      message: 'Activity added to session',
      data: {
        ...labSession.toObject(),
        activities
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add activity',
      error: error.message
    });
  }
};

// @desc    Remove activity from lab session
// @route   DELETE /api/lab-sessions/:id/activities/:activityId
export const removeActivityFromSession = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Soft delete - set isActive to false
    await Activity.findByIdAndUpdate(req.params.activityId, {
      isActive: false
    });

    res.json({
      success: true,
      message: 'Activity removed from session'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove activity',
      error: error.message
    });
  }
};

// @desc    Get session-wide student progress
// @route   GET /api/lab-sessions/:id/progress
export const getSessionProgress = async (req, res) => {
  try {
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    // Check authorization (instructor only)
    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view progress'
      });
    }

    // Get enrolled students
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);

    // Get activities
    const activities = await Activity.find({ labSession: labSession._id, isActive: true })
      .sort({ orderInSession: 1 });

    // Get all submissions and hints for this session
    const submissions = await Submission.find({ labSessionId: labSession._id });
    const hints = await HintRequest.find({ activityId: { $in: activities.map(a => a._id) } });

    // Build progress for each student
    const studentProgress = await Promise.all(enrolledStudents.map(async (student) => {
      const studentSubmissions = submissions.filter(s => s.studentId.toString() === student._id.toString());
      const studentHints = hints.filter(h => h.studentId.toString() === student._id.toString());

      // Calculate progress per activity
      const activityProgress = activities.map(activity => {
        const activitySubmissions = studentSubmissions.filter(s => s.activityId.toString() === activity._id.toString());
        const activityHints = studentHints.filter(h => h.activityId.toString() === activity._id.toString());

        const bestSubmission = activitySubmissions.reduce((best, curr) =>
          !best || curr.score > best.score ? curr : best, null);

        return {
          activityId: activity._id,
          activityTitle: activity.title,
          attempts: activitySubmissions.length,
          bestScore: bestSubmission?.score || 0,
          status: bestSubmission?.status || 'not_started',
          passed: bestSubmission?.status === 'passed',
          hintsUsed: activityHints.length,
          lastAttempt: activitySubmissions[0]?.createdAt || null
        };
      });

      // Calculate overall stats
      const totalActivities = activities.length;
      const completedActivities = activityProgress.filter(a => a.passed).length;
      const totalAttempts = studentSubmissions.length;
      const totalHints = studentHints.length;
      const avgScore = activityProgress.length > 0
        ? Math.round(activityProgress.reduce((sum, a) => sum + a.bestScore, 0) / activityProgress.length)
        : 0;

      return {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
          course: student.course,
          yearLevel: student.yearLevel,
          section: student.section
        },
        progress: {
          completedActivities,
          totalActivities,
          completionRate: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
          totalAttempts,
          totalHints,
          avgScore
        },
        activities: activityProgress
      };
    }));

    // Calculate session-wide stats
    const sessionStats = {
      totalStudents: enrolledStudents.length,
      totalActivities: activities.length,
      avgCompletionRate: studentProgress.length > 0
        ? Math.round(studentProgress.reduce((sum, s) => sum + s.progress.completionRate, 0) / studentProgress.length)
        : 0,
      studentsCompleted: studentProgress.filter(s => s.progress.completionRate === 100).length,
      totalSubmissions: submissions.length,
      totalHintsUsed: hints.length
    };

    res.json({
      success: true,
      data: {
        session: {
          _id: labSession._id,
          title: labSession.title,
          course: labSession.course,
          yearLevel: labSession.yearLevel,
          section: labSession.section
        },
        stats: sessionStats,
        students: studentProgress,
        activities: activities.map(a => ({
          _id: a._id,
          title: a.title,
          topic: a.topic,
          difficulty: a.difficulty,
          type: a.type,
          aiAssistanceLevel: a.aiAssistanceLevel
        }))
      }
    });
  } catch (error) {
    console.error('Get session progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session progress',
      error: error.message
    });
  }
};

// @desc    Get detailed activity progress (all students for one activity)
// @route   GET /api/lab-sessions/:id/activities/:activityId/progress
export const getActivityProgress = async (req, res) => {
  try {
    const { id: sessionId, activityId } = req.params;

    const labSession = await LabSession.findById(sessionId);
    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    // Check authorization
    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view progress'
      });
    }

    const activity = await Activity.findById(activityId).populate('testCases');
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Get enrolled students
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(sessionId);

    // Get all submissions for this activity
    const submissions = await Submission.find({ activityId })
      .sort({ createdAt: -1 });

    // Get all hints for this activity
    const hints = await HintRequest.find({ activityId })
      .sort({ createdAt: -1 });

    // Build detailed progress per student
    const studentProgress = enrolledStudents.map(student => {
      const studentSubmissions = submissions.filter(s => s.studentId.toString() === student._id.toString());
      const studentHints = hints.filter(h => h.studentId.toString() === student._id.toString());

      const bestSubmission = studentSubmissions.reduce((best, curr) =>
        !best || curr.score > best.score ? curr : best, null);

      // Get hints breakdown by level
      const hintsByLevel = {};
      studentHints.forEach(h => {
        hintsByLevel[h.hintLevel] = (hintsByLevel[h.hintLevel] || 0) + 1;
      });

      return {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
          course: student.course,
          yearLevel: student.yearLevel,
          section: student.section
        },
        submissions: {
          total: studentSubmissions.length,
          bestScore: bestSubmission?.score || 0,
          status: bestSubmission?.status || 'not_started',
          passed: bestSubmission?.status === 'passed',
          firstAttempt: studentSubmissions[studentSubmissions.length - 1]?.createdAt || null,
          lastAttempt: studentSubmissions[0]?.createdAt || null,
          bestSubmissionId: bestSubmission?._id || null
        },
        hints: {
          total: studentHints.length,
          byLevel: hintsByLevel,
          highestLevel: studentHints.length > 0 ? Math.max(...studentHints.map(h => h.hintLevel)) : 0
        },
        recentSubmissions: studentSubmissions.slice(0, 5).map(s => ({
          _id: s._id,
          score: s.score,
          status: s.status,
          attemptNumber: s.attemptNumber,
          createdAt: s.createdAt
        }))
      };
    });

    // Activity-wide stats
    const activityStats = {
      totalStudents: enrolledStudents.length,
      studentsAttempted: studentProgress.filter(s => s.submissions.total > 0).length,
      studentsPassed: studentProgress.filter(s => s.submissions.passed).length,
      passRate: enrolledStudents.length > 0
        ? Math.round((studentProgress.filter(s => s.submissions.passed).length / enrolledStudents.length) * 100)
        : 0,
      avgScore: studentProgress.filter(s => s.submissions.total > 0).length > 0
        ? Math.round(
            studentProgress
              .filter(s => s.submissions.total > 0)
              .reduce((sum, s) => sum + s.submissions.bestScore, 0) /
            studentProgress.filter(s => s.submissions.total > 0).length
          )
        : 0,
      totalSubmissions: submissions.length,
      totalHints: hints.length,
      avgAttempts: studentProgress.filter(s => s.submissions.total > 0).length > 0
        ? Math.round(
            studentProgress.reduce((sum, s) => sum + s.submissions.total, 0) /
            studentProgress.filter(s => s.submissions.total > 0).length * 10
          ) / 10
        : 0
    };

    res.json({
      success: true,
      data: {
        activity: {
          _id: activity._id,
          title: activity.title,
          description: activity.description,
          topic: activity.topic,
          difficulty: activity.difficulty,
          type: activity.type,
          language: activity.language,
          timeLimit: activity.timeLimit,
          aiAssistanceLevel: activity.aiAssistanceLevel,
          testCaseCount: activity.testCases?.length || 0
        },
        stats: activityStats,
        students: studentProgress
      }
    });
  } catch (error) {
    console.error('Get activity progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity progress',
      error: error.message
    });
  }
};

// @desc    Extend lab session end time
// @route   PUT /api/lab-sessions/:id/extend
export const extendLabSession = async (req, res) => {
  try {
    const { extendedEndTime } = req.body;
    const labSession = await LabSession.findById(req.params.id);

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to extend this session'
      });
    }

    // Validate time format (HH:MM)
    if (!extendedEndTime || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(extendedEndTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format.'
      });
    }

    labSession.extendedEndTime = extendedEndTime;
    await labSession.save();

    await labSession.populate('instructor', 'firstName lastName fullName email');
    const enrolledStudents = await getEnrolledStudentsWithUserInfo(labSession._id);
    const activities = await getSessionActivities(labSession._id);

    const responseData = {
      ...labSession.toObject(),
      allowedStudents: enrolledStudents,
      activities
    };

    // Notify students and instructors
    emitToLabSession(labSession._id, 'lab-session-extended', {
      sessionId: labSession._id,
      extendedEndTime,
      session: responseData
    });
    emitToAllStudents('lab-session-extended', {
      sessionId: labSession._id,
      extendedEndTime,
      session: responseData
    });

    res.json({
      success: true,
      message: `Lab session extended until ${extendedEndTime}`,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to extend lab session',
      error: error.message
    });
  }
};

// @desc    Allow student to resubmit (instructor action)
// @route   PUT /api/lab-sessions/:sessionId/resubmit/:studentId/:activityId
export const allowResubmission = async (req, res) => {
  try {
    const { sessionId, studentId, activityId } = req.params;

    const labSession = await LabSession.findById(sessionId);
    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Find the student's best submission for this activity and reset it
    const submission = await Submission.findOne({
      studentId,
      activityId,
      status: 'passed'
    }).sort({ score: -1 });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'No passed submission found for this student'
      });
    }

    // Mark the submission as needing resubmission
    submission.status = 'resubmission_required';
    submission.isBest = false;
    await submission.save();

    // Notify the student
    const student = await Student.findById(studentId).populate('userId', 'firstName lastName');
    emitToUsers([student.userId._id], 'resubmission-required', {
      activityId,
      sessionId,
      message: 'Your instructor has requested a resubmission for this activity.'
    });

    res.json({
      success: true,
      message: `Resubmission required for ${student.userId.firstName} ${student.userId.lastName}`,
      data: { submission }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to allow resubmission',
      error: error.message
    });
  }
};
