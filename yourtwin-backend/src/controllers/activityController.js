import Activity from '../models/Activity.js';
import LabSession from '../models/LabSession.js';
import TestCase from '../models/TestCase.js';
import Student from '../models/Student.js';
import SessionEnrollment from '../models/SessionEnrollment.js';
import CodeSnapshot from '../models/CodeSnapshot.js';
import { emitToLabSession, emitToAllStudents, emitToAllInstructors } from '../utils/socket.js';

// @desc    Create activity within a lab session
// @route   POST /api/lab-sessions/:sessionId/activities
export const createActivity = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { testCases: testCasesData, ...activityData } = req.body;

    // Get lab session
    const labSession = await LabSession.findById(sessionId);
    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    // Check ownership
    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add activities to this session'
      });
    }

    // Count existing activities for order
    const existingCount = await Activity.countDocuments({ labSession: sessionId });

    // Create activity
    const activity = await Activity.create({
      ...activityData,
      labSession: sessionId,
      createdBy: req.user._id,
      orderInSession: existingCount + 1
    });

    // Create test cases if provided
    if (testCasesData && testCasesData.length > 0) {
      const testCases = testCasesData.map((tc, index) => ({
        activityId: activity._id,
        input: tc.input || '',
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden || false,
        weight: tc.weight || tc.points || 1,
        description: tc.description || '',
        orderIndex: index
      }));
      await TestCase.insertMany(testCases);
    }

    // Populate activity with test cases
    await activity.populate('testCases');
    await activity.populate('createdBy', 'firstName lastName email');

    // Emit real-time update
    console.log(`📡 [Socket] Activity created: ${activity.title} in session ${sessionId}`);
    emitToLabSession(sessionId, 'activity-created', {
      sessionId,
      activity
    });
    emitToAllStudents('activity-created', {
      sessionId,
      activity
    });
    emitToAllInstructors('activity-created', {
      sessionId,
      activity
    });

    res.status(201).json({
      success: true,
      message: 'Activity created successfully in session',
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message
    });
  }
};

// @desc    Get activities in a lab session
// @route   GET /api/lab-sessions/:sessionId/activities
export const getSessionActivities = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get lab session
    const labSession = await LabSession.findById(sessionId);
    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    // Check if student has access to session
    if (req.user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: req.user._id });
      if (!studentProfile) {
        return res.status(403).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      const isEnrolled = await SessionEnrollment.isEnrolled(sessionId, studentProfile._id);
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
    }

    const activities = await Activity.find({ labSession: sessionId, isActive: true })
      .populate('testCases')
      .populate('createdBy', 'firstName lastName email')
      .sort({ orderInSession: 1 });

    res.json({
      success: true,
      count: activities.length,
      data: activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
};

// @desc    Get single activity
// @route   GET /api/activities/:id
export const getActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('testCases')
      .populate('labSession', 'title isActive instructor')
      .populate('createdBy', 'firstName lastName email');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check if student has access
    if (req.user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: req.user._id });
      if (!studentProfile) {
        return res.status(403).json({
          success: false,
          message: 'Student profile not found'
        });
      }

      const labSession = await LabSession.findById(activity.labSession._id);
      const isEnrolled = await SessionEnrollment.isEnrolled(labSession._id, studentProfile._id);

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this activity'
        });
      }

      if (!labSession.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This session is not active'
        });
      }
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
      error: error.message
    });
  }
};

// @desc    Update activity (Instructor only)
// @route   PUT /api/activities/:id
export const updateActivity = async (req, res) => {
  try {
    const { testCases: testCasesData, ...activityData } = req.body;
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check if user is the creator
    if (activity.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this activity'
      });
    }

    // Update activity
    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      activityData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    // Update test cases if provided
    if (testCasesData && Array.isArray(testCasesData)) {
      // Delete existing test cases
      await TestCase.deleteMany({ activityId: activity._id });

      // Create new test cases
      if (testCasesData.length > 0) {
        const testCases = testCasesData.map((tc, index) => ({
          activityId: activity._id,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden || false,
          weight: tc.weight || tc.points || 1,
          description: tc.description || '',
          orderIndex: index
        }));
        await TestCase.insertMany(testCases);
      }
    }

    // Populate test cases
    await updatedActivity.populate('testCases');

    // Emit real-time update
    if (updatedActivity.labSession) {
      console.log(`📡 [Socket] Activity updated: ${updatedActivity.title}`);
      emitToLabSession(updatedActivity.labSession, 'activity-updated', {
        sessionId: updatedActivity.labSession,
        activity: updatedActivity
      });
      emitToAllStudents('activity-updated', {
        sessionId: updatedActivity.labSession,
        activity: updatedActivity
      });
      emitToAllInstructors('activity-updated', {
        sessionId: updatedActivity.labSession,
        activity: updatedActivity
      });
    }

    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: updatedActivity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update activity',
      error: error.message
    });
  }
};

// @desc    Delete activity (Instructor only)
// @route   DELETE /api/activities/:id
export const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check if user is the creator
    if (activity.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this activity'
      });
    }

    // Store session ID before soft delete
    const sessionId = activity.labSession;

    // Soft delete activity
    activity.isActive = false;
    await activity.save();

    // Note: Test cases remain in database for historical record

    // Emit real-time update
    if (sessionId) {
      console.log(`📡 [Socket] Activity deleted: ${activity.title}`);
      emitToLabSession(sessionId, 'activity-deleted', {
        sessionId: sessionId,
        activityId: activity._id
      });
      emitToAllStudents('activity-deleted', {
        sessionId: sessionId,
        activityId: activity._id
      });
      emitToAllInstructors('activity-deleted', {
        sessionId: sessionId,
        activityId: activity._id
      });
    }

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
      error: error.message
    });
  }
};

// @desc    Save draft code for an activity (auto-save)
// @route   POST /api/activities/:id/draft
export const saveDraftCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    const activityId = req.params.id;

    if (!code && code !== '') {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }

    // Get student profile
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(403).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Get activity to find lab session
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Find existing draft or create new one
    let draft = await CodeSnapshot.findOne({
      studentId: studentProfile._id,
      activityId: activityId,
      snapshotType: 'draft'
    });

    if (draft) {
      // Update existing draft
      draft.code = code;
      draft.language = language || activity.language;
      draft.metrics = {
        lineCount: code.split('\n').length,
        charCount: code.length
      };
      await draft.save();
    } else {
      // Create new draft
      draft = await CodeSnapshot.create({
        studentId: studentProfile._id,
        activityId: activityId,
        labSessionId: activity.labSession,
        code: code,
        language: language || activity.language,
        snapshotType: 'draft',
        metrics: {
          lineCount: code.split('\n').length,
          charCount: code.length
        }
      });
    }

    res.json({
      success: true,
      message: 'Draft saved',
      data: {
        savedAt: draft.updatedAt || draft.createdAt
      }
    });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: error.message
    });
  }
};

// @desc    Load draft code for an activity
// @route   GET /api/activities/:id/draft
export const loadDraftCode = async (req, res) => {
  try {
    const activityId = req.params.id;

    // Get student profile
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(403).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Find draft
    const draft = await CodeSnapshot.findOne({
      studentId: studentProfile._id,
      activityId: activityId,
      snapshotType: 'draft'
    }).sort({ updatedAt: -1 });

    if (!draft) {
      return res.json({
        success: true,
        data: null,
        message: 'No draft found'
      });
    }

    res.json({
      success: true,
      data: {
        code: draft.code,
        language: draft.language,
        savedAt: draft.updatedAt || draft.createdAt
      }
    });
  } catch (error) {
    console.error('Load draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load draft',
      error: error.message
    });
  }
};

// @desc    Clear draft code for an activity (on reset)
// @route   DELETE /api/activities/:id/draft
export const clearDraftCode = async (req, res) => {
  try {
    const activityId = req.params.id;

    // Get student profile
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(403).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Delete draft
    await CodeSnapshot.deleteOne({
      studentId: studentProfile._id,
      activityId: activityId,
      snapshotType: 'draft'
    });

    res.json({
      success: true,
      message: 'Draft cleared'
    });
  } catch (error) {
    console.error('Clear draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear draft',
      error: error.message
    });
  }
};
