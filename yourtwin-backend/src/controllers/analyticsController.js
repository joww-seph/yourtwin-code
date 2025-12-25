import Submission from '../models/Submission.js';
import Activity from '../models/Activity.js';
import LabSession from '../models/LabSession.js';
import Student from '../models/Student.js';
import mongoose from 'mongoose';

// @desc    Get instructor analytics overview
// @route   GET /api/analytics/overview
export const getAnalyticsOverview = async (req, res) => {
  try {
    // Get all sessions for this instructor
    const sessions = await LabSession.find({ instructor: req.user._id });
    const sessionIds = sessions.map(s => s._id);

    // Get all activities in instructor's sessions
    const activities = await Activity.find({ labSession: { $in: sessionIds } });
    const activityIds = activities.map(a => a._id);

    // Get all submissions for these activities
    const submissions = await Submission.find({ activityId: { $in: activityIds } })
      .populate('studentId', 'firstName lastName studentId')
      .populate('activityId', 'title topic difficulty');

    // Calculate overview stats
    const totalSubmissions = submissions.length;
    const passedSubmissions = submissions.filter(s => s.status === 'passed').length;
    const failedSubmissions = submissions.filter(s => s.status === 'failed').length;
    const avgScore = submissions.length > 0
      ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
      : 0;

    // Unique students who submitted
    const uniqueStudents = [...new Set(submissions.map(s => s.studentId?._id?.toString()).filter(Boolean))];

    // Total enrolled students across sessions
    const totalEnrolled = sessions.reduce((sum, s) => sum + (s.allowedStudents?.length || 0), 0);

    // Active students today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySubmissions = submissions.filter(s => new Date(s.createdAt) >= today);
    const activeToday = [...new Set(todaySubmissions.map(s => s.studentId?._id?.toString()).filter(Boolean))].length;

    // Pass rate
    const passRate = totalSubmissions > 0
      ? Math.round((passedSubmissions / totalSubmissions) * 100)
      : 0;

    // Submissions by day (last 7 days)
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySubmissions = submissions.filter(s => {
        const subDate = new Date(s.createdAt);
        return subDate >= date && subDate < nextDate;
      });

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        submissions: daySubmissions.length,
        passed: daySubmissions.filter(s => s.status === 'passed').length,
        failed: daySubmissions.filter(s => s.status === 'failed').length
      });
    }

    // Topic performance
    const topicMap = new Map();
    submissions.forEach(s => {
      if (!s.activityId?.topic) return;
      const topic = s.activityId.topic;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { topic, attempts: 0, passed: 0, totalScore: 0 });
      }
      const data = topicMap.get(topic);
      data.attempts++;
      data.totalScore += s.score;
      if (s.status === 'passed') data.passed++;
    });

    const topicPerformance = Array.from(topicMap.values()).map(t => ({
      topic: t.topic,
      attempts: t.attempts,
      passRate: t.attempts > 0 ? Math.round((t.passed / t.attempts) * 100) : 0,
      avgScore: t.attempts > 0 ? Math.round(t.totalScore / t.attempts) : 0
    }));

    // Difficulty breakdown
    const difficultyMap = new Map();
    submissions.forEach(s => {
      if (!s.activityId?.difficulty) return;
      const diff = s.activityId.difficulty;
      if (!difficultyMap.has(diff)) {
        difficultyMap.set(diff, { difficulty: diff, attempts: 0, passed: 0, totalScore: 0 });
      }
      const data = difficultyMap.get(diff);
      data.attempts++;
      data.totalScore += s.score;
      if (s.status === 'passed') data.passed++;
    });

    const difficultyBreakdown = Array.from(difficultyMap.values()).map(d => ({
      difficulty: d.difficulty,
      attempts: d.attempts,
      passRate: d.attempts > 0 ? Math.round((d.passed / d.attempts) * 100) : 0,
      avgScore: d.attempts > 0 ? Math.round(d.totalScore / d.attempts) : 0
    }));

    // Helper to format student name safely
    const formatStudentName = (student) => {
      if (!student) return 'Unknown';
      const firstName = student.firstName || '';
      const lastName = student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || student.studentId || 'Unknown';
    };

    // Recent submissions (last 20)
    const recentSubmissions = submissions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(s => ({
        _id: s._id,
        studentName: formatStudentName(s.studentId),
        studentId: s.studentId?.studentId || 'N/A',
        activityTitle: s.activityId?.title || 'Unknown Activity',
        score: s.score || 0,
        status: s.status || 'unknown',
        attemptNumber: s.attemptNumber || 1,
        createdAt: s.createdAt
      }));

    res.json({
      success: true,
      data: {
        overview: {
          totalSessions: sessions.length,
          activeSessions: sessions.filter(s => s.isActive).length,
          totalActivities: activities.length,
          totalEnrolled,
          activeStudents: uniqueStudents.length,
          activeToday,
          totalSubmissions,
          passedSubmissions,
          failedSubmissions,
          passRate,
          avgScore
        },
        dailyStats,
        topicPerformance,
        difficultyBreakdown,
        recentSubmissions
      }
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// @desc    Get session-specific analytics
// @route   GET /api/analytics/session/:sessionId
export const getSessionAnalytics = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await LabSession.findById(sessionId)
      .populate('allowedStudents', 'firstName lastName studentId course yearLevel section');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Verify ownership
    if (session.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const activities = await Activity.find({ labSession: sessionId });
    const activityIds = activities.map(a => a._id);

    const submissions = await Submission.find({ activityId: { $in: activityIds } })
      .populate('studentId', 'firstName lastName studentId')
      .populate('activityId', 'title topic difficulty');

    // Per-activity stats
    const activityStats = activities.map(activity => {
      const actSubs = submissions.filter(s => s.activityId?._id?.toString() === activity._id.toString());
      const passed = actSubs.filter(s => s.status === 'passed').length;
      const uniqueStudents = [...new Set(actSubs.map(s => s.studentId?._id?.toString()).filter(Boolean))];
      const passedStudents = [...new Set(
        actSubs.filter(s => s.status === 'passed').map(s => s.studentId?._id?.toString()).filter(Boolean)
      )];

      return {
        _id: activity._id,
        title: activity.title,
        topic: activity.topic,
        difficulty: activity.difficulty,
        totalSubmissions: actSubs.length,
        uniqueStudents: uniqueStudents.length,
        passedStudents: passedStudents.length,
        passRate: uniqueStudents.length > 0 ? Math.round((passedStudents.length / uniqueStudents.length) * 100) : 0,
        avgScore: actSubs.length > 0 ? Math.round(actSubs.reduce((sum, s) => sum + s.score, 0) / actSubs.length) : 0
      };
    });

    // Per-student stats
    const studentStats = (session.allowedStudents || []).map(student => {
      const studentSubs = submissions.filter(s => s.studentId?._id?.toString() === student._id.toString());
      const passedActivities = [...new Set(
        studentSubs.filter(s => s.status === 'passed').map(s => s.activityId?._id?.toString()).filter(Boolean)
      )];

      // Format student name safely
      const firstName = student.firstName || '';
      const lastName = student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || student.studentId || 'Unknown';

      return {
        _id: student._id,
        name: fullName,
        studentId: student.studentId || 'N/A',
        totalSubmissions: studentSubs.length,
        passedActivities: passedActivities.length,
        totalActivities: activities.length,
        completionRate: activities.length > 0 ? Math.round((passedActivities.length / activities.length) * 100) : 0,
        avgScore: studentSubs.length > 0 ? Math.round(studentSubs.reduce((sum, s) => sum + s.score, 0) / studentSubs.length) : 0,
        lastActivity: studentSubs.length > 0 ? studentSubs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt : null
      };
    });

    res.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title,
          isActive: session.isActive,
          totalStudents: session.allowedStudents?.length || 0,
          totalActivities: activities.length
        },
        activityStats,
        studentStats: studentStats.sort((a, b) => b.avgScore - a.avgScore)
      }
    });
  } catch (error) {
    console.error('Get session analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session analytics',
      error: error.message
    });
  }
};

// @desc    Get real-time activity feed
// @route   GET /api/analytics/live
export const getLiveActivity = async (req, res) => {
  try {
    const sessions = await LabSession.find({ instructor: req.user._id, isActive: true });
    const sessionIds = sessions.map(s => s._id);

    const activities = await Activity.find({ labSession: { $in: sessionIds } });
    const activityIds = activities.map(a => a._id);

    // Get last 30 minutes of submissions
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const recentSubmissions = await Submission.find({
      activityId: { $in: activityIds },
      createdAt: { $gte: thirtyMinutesAgo }
    })
      .populate('studentId', 'firstName lastName studentId')
      .populate('activityId', 'title labSession')
      .sort({ createdAt: -1 })
      .limit(50);

    // Helper to format student name safely
    const formatStudentName = (student) => {
      if (!student) return 'Unknown';
      const firstName = student.firstName || '';
      const lastName = student.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || student.studentId || 'Unknown';
    };

    const liveActivity = recentSubmissions.map(s => ({
      _id: s._id,
      type: 'submission',
      studentName: formatStudentName(s.studentId),
      activityTitle: s.activityId?.title || 'Unknown Activity',
      sessionId: s.activityId?.labSession,
      score: s.score || 0,
      status: s.status || 'unknown',
      timestamp: s.createdAt
    }));

    res.json({
      success: true,
      data: liveActivity
    });
  } catch (error) {
    console.error('Get live activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live activity',
      error: error.message
    });
  }
};
