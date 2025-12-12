import Activity from '../models/Activity.js';

// @desc    Get all activities
// @route   GET /api/activities
export const getActivities = async (req, res) => {
  try {
    const { type, topic, difficulty } = req.query;
    
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    
    const activities = await Activity.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
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
      .populate('createdBy', 'name email');
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
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

// @desc    Create activity (Instructor only)
// @route   POST /api/activities
export const createActivity = async (req, res) => {
  try {
    const activity = await Activity.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
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

// @desc    Update activity (Instructor only)
// @route   PUT /api/activities/:id
export const updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: activity
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
    
    // Soft delete
    activity.isActive = false;
    await activity.save();
    
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