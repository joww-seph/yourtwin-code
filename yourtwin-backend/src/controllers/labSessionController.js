import LabSession from '../models/LabSession.js';
import Activity from '../models/Activity.js';

// @desc    Create lab session
// @route   POST /api/lab-sessions
export const createLabSession = async (req, res) => {
  try {
    const labSession = await LabSession.create({
      ...req.body,
      instructor: req.user._id
    });

    await labSession.populate('activities');

    res.status(201).json({
      success: true,
      message: 'Lab session created successfully',
      data: labSession
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create lab session',
      error: error.message
    });
  }
};

// @desc    Get all lab sessions (filtered by instructor or for student)
// @route   GET /api/lab-sessions
export const getLabSessions = async (req, res) => {
  try {
    const { status, course, yearLevel, section } = req.query;
    const filter = {};

    // Filter by instructor for instructors
    if (req.user.role === 'instructor') {
      filter.instructor = req.user._id;
    }

    // Filter by student's course/year/section for students
    if (req.user.role === 'student') {
      filter.course = req.user.course;
      filter.yearLevel = req.user.yearLevel;
      filter.section = req.user.section;
    }

    if (status) filter.status = status;
    if (course) filter.course = course;
    if (yearLevel) filter.yearLevel = parseInt(yearLevel);
    if (section) filter.section = section.toUpperCase();

    const labSessions = await LabSession.find(filter)
      .populate('instructor', 'firstName lastName fullName email')
      .populate('activities', 'title topic difficulty type')
      .sort({ scheduledDate: -1 });

    res.json({
      success: true,
      count: labSessions.length,
      data: labSessions
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
      .populate('instructor', 'firstName lastName fullName email')
      .populate('activities');

    if (!labSession) {
      return res.status(404).json({
        success: false,
        message: 'Lab session not found'
      });
    }

    res.json({
      success: true,
      data: labSession
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

    // Check ownership
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
    ).populate('activities');

    res.json({
      success: true,
      message: 'Lab session updated successfully',
      data: updatedSession
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

    // Check ownership
    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session'
      });
    }

    labSession.isActive = false;
    await labSession.save();

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

// @desc    Add activity to lab session
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

    // Check ownership
    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check if activity exists
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Check if already added
    if (labSession.activities.includes(activityId)) {
      return res.status(400).json({
        success: false,
        message: 'Activity already in session'
      });
    }

    labSession.activities.push(activityId);
    await labSession.save();

    // Update activity's labSession reference
    activity.labSession = labSession._id;
    activity.orderInSession = labSession.activities.length;
    await activity.save();

    await labSession.populate('activities');

    res.json({
      success: true,
      message: 'Activity added to session',
      data: labSession
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

    // Check ownership
    if (labSession.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    labSession.activities = labSession.activities.filter(
      id => id.toString() !== req.params.activityId
    );
    await labSession.save();

    // Remove labSession reference from activity
    await Activity.findByIdAndUpdate(req.params.activityId, {
      labSession: null,
      orderInSession: 0
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