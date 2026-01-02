/**
 * DIGITAL TWIN CONTROLLER
 *
 * API endpoints for both Mirror Twin and Shadow Twin features.
 *
 * DIGITAL TWIN ARCHITECTURE:
 * - MIRROR TWIN: Exact replica of student's learning data. Endpoints include:
 *   - GET /profile - Full Mirror Twin profile with all learning metrics
 *   - GET /ai-dependency - AI dependency analysis
 *   - GET /recommendations - Personalized learning recommendations
 *   - GET /behavior - Coding behavior analysis
 *   - GET /competencies - Topic competency summary
 *   - GET /velocity-history - Learning velocity trends
 *
 * - SHADOW TWIN: Cognitive opposite that powers the hint system. Endpoints:
 *   - GET /shadow-personality - Shadow Twin's complementary traits
 *   - POST /encourage-independence - Check if student needs independence nudge
 *   - POST /adjust-hint-level - Adjust hint level based on profile
 *   - POST /hint-feedback - Process feedback on hints
 */

import Student from '../models/Student.js';
import StudentTwin from '../models/StudentTwin.js';
import StudentCompetency from '../models/StudentCompetency.js';
import {
  getDigitalTwinAnalysis,
  analyzeAIDependency,
  getLearningRecommendations,
  getCodingBehaviorAnalysis
} from '../services/digitalTwinService.js';
import {
  getShadowTwinPersonality,
  shouldEncourageIndependence,
  adjustHintLevel,
  getPostHintFeedback
} from '../services/shadowTwinEngine.js';

/**
 * @desc    Get complete Digital Twin profile for current user
 * @route   GET /api/twin/profile
 * @access  Private (Student)
 */
export const getMyTwinProfile = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const analysis = await getDigitalTwinAnalysis(studentProfile._id);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get twin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch twin profile',
      error: error.message
    });
  }
};

/**
 * @desc    Get AI dependency analysis
 * @route   GET /api/twin/ai-dependency
 * @access  Private (Student)
 */
export const getAIDependencyAnalysis = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const analysis = await analyzeAIDependency(studentProfile._id);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get AI dependency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI dependency analysis',
      error: error.message
    });
  }
};

/**
 * @desc    Get personalized learning recommendations
 * @route   GET /api/twin/recommendations
 * @access  Private (Student)
 */
export const getRecommendations = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const recommendations = await getLearningRecommendations(studentProfile._id);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: error.message
    });
  }
};

/**
 * @desc    Get coding behavior analysis
 * @route   GET /api/twin/behavior
 * @access  Private (Student)
 */
export const getCodingBehavior = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { activityId } = req.query;
    const analysis = await getCodingBehaviorAnalysis(
      studentProfile._id,
      activityId || null
    );

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get coding behavior error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coding behavior',
      error: error.message
    });
  }
};

/**
 * @desc    Get Shadow Twin personality for current user
 * @route   GET /api/twin/shadow-personality
 * @access  Private (Student)
 */
export const getShadowPersonality = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const personality = await getShadowTwinPersonality(studentProfile._id);

    res.json({
      success: true,
      data: personality
    });
  } catch (error) {
    console.error('Get shadow personality error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shadow personality',
      error: error.message
    });
  }
};

/**
 * @desc    Check if student should be encouraged to try independently
 * @route   POST /api/twin/encourage-independence
 * @access  Private (Student)
 */
export const checkEncourageIndependence = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { activityId } = req.body;
    if (!activityId) {
      return res.status(400).json({
        success: false,
        message: 'Activity ID is required'
      });
    }

    const result = await shouldEncourageIndependence(studentProfile._id, activityId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Check encourage independence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check independence',
      error: error.message
    });
  }
};

/**
 * @desc    Adjust hint level based on student profile
 * @route   POST /api/twin/adjust-hint-level
 * @access  Private (Student)
 */
export const adjustHintLevelForStudent = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { requestedLevel, activityId } = req.body;
    if (!requestedLevel || !activityId) {
      return res.status(400).json({
        success: false,
        message: 'Requested level and activity ID are required'
      });
    }

    const result = await adjustHintLevel(studentProfile._id, requestedLevel, activityId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Adjust hint level error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust hint level',
      error: error.message
    });
  }
};

/**
 * @desc    Get post-hint feedback
 * @route   POST /api/twin/hint-feedback
 * @access  Private (Student)
 */
export const getHintFeedback = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const { hintLevel, wasHelpful } = req.body;

    const feedback = await getPostHintFeedback(
      studentProfile._id,
      hintLevel || 1,
      wasHelpful ?? true
    );

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get hint feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get hint feedback',
      error: error.message
    });
  }
};

/**
 * @desc    Get competency summary
 * @route   GET /api/twin/competencies
 * @access  Private (Student)
 */
export const getCompetencySummary = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const summary = await StudentCompetency.getSummary(studentProfile._id);
    const competencies = await StudentCompetency.find({ studentId: studentProfile._id });

    res.json({
      success: true,
      data: {
        summary,
        competencies: competencies.map(c => ({
          topic: c.topic,
          proficiency: Math.round(c.proficiencyLevel * 100),
          successRate: c.successRate,
          attempts: c.totalAttempts,
          lastAttempt: c.lastAttemptAt
        }))
      }
    });
  } catch (error) {
    console.error('Get competency summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get competency summary',
      error: error.message
    });
  }
};

/**
 * @desc    Get velocity history for charts
 * @route   GET /api/twin/velocity-history
 * @access  Private (Student)
 */
export const getVelocityHistory = async (req, res) => {
  try {
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    const twin = await StudentTwin.getOrCreate(studentProfile._id);

    res.json({
      success: true,
      data: {
        currentVelocity: twin.learningVelocity,
        history: twin.velocityHistory || [],
        trend: twin.aiDependencyPattern?.dependencyTrend || 'unknown'
      }
    });
  } catch (error) {
    console.error('Get velocity history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get velocity history',
      error: error.message
    });
  }
};

// ============ INSTRUCTOR ENDPOINTS ============

/**
 * @desc    Get Digital Twin for a specific student (instructor view)
 * @route   GET /api/twin/student/:studentId
 * @access  Private (Instructor)
 */
export const getStudentTwin = async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can view student twins'
      });
    }

    const { studentId } = req.params;
    const analysis = await getDigitalTwinAnalysis(studentId);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Get student twin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student twin',
      error: error.message
    });
  }
};

/**
 * @desc    Get class-wide twin analytics
 * @route   GET /api/twin/class-analytics/:sessionId
 * @access  Private (Instructor)
 */
export const getClassTwinAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can view class analytics'
      });
    }

    const { sessionId } = req.params;

    // Get all students in the session
    const SessionEnrollment = (await import('../models/SessionEnrollment.js')).default;
    const enrollments = await SessionEnrollment.find({ labSessionId: sessionId })
      .populate('studentId');

    const studentAnalytics = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          const twin = await StudentTwin.getOrCreate(enrollment.studentId._id);
          const competencySummary = await StudentCompetency.getSummary(enrollment.studentId._id);

          return {
            studentId: enrollment.studentId._id,
            name: `${enrollment.studentId.userId?.firstName || 'Unknown'} ${enrollment.studentId.userId?.lastName || ''}`.trim(),
            learningVelocity: twin.learningVelocity,
            aiDependency: Math.round(twin.behavioralData?.aiDependencyScore * 100) || 0,
            activitiesCompleted: twin.totalActivitiesCompleted,
            avgProficiency: competencySummary.avgProficiency,
            strengths: twin.strengths?.slice(0, 2) || [],
            weaknesses: twin.weaknesses?.slice(0, 2) || [],
            lastActivity: twin.lastActivityDate
          };
        } catch (err) {
          return null;
        }
      })
    );

    // Filter out nulls and calculate class averages
    const validAnalytics = studentAnalytics.filter(Boolean);

    const classAverages = {
      avgVelocity: validAnalytics.length > 0
        ? Math.round(validAnalytics.reduce((sum, s) => sum + s.learningVelocity, 0) / validAnalytics.length)
        : 0,
      avgAiDependency: validAnalytics.length > 0
        ? Math.round(validAnalytics.reduce((sum, s) => sum + s.aiDependency, 0) / validAnalytics.length)
        : 0,
      avgProficiency: validAnalytics.length > 0
        ? Math.round(validAnalytics.reduce((sum, s) => sum + s.avgProficiency, 0) / validAnalytics.length)
        : 0,
      totalStudents: validAnalytics.length,
      activeToday: validAnalytics.filter(s => {
        if (!s.lastActivity) return false;
        const today = new Date().toDateString();
        return new Date(s.lastActivity).toDateString() === today;
      }).length
    };

    // Identify students needing attention
    const needsAttention = validAnalytics.filter(s =>
      s.learningVelocity < 30 ||
      s.aiDependency > 70 ||
      s.avgProficiency < 30
    );

    res.json({
      success: true,
      data: {
        students: validAnalytics,
        classAverages,
        needsAttention: needsAttention.map(s => ({
          ...s,
          concern: s.learningVelocity < 30 ? 'low_velocity' :
            s.aiDependency > 70 ? 'high_ai_dependency' : 'low_proficiency'
        }))
      }
    });
  } catch (error) {
    console.error('Get class analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch class analytics',
      error: error.message
    });
  }
};
