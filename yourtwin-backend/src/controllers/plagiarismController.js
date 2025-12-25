import Submission from '../models/Submission.js';
import Activity from '../models/Activity.js';
import LabSession from '../models/LabSession.js';
import Student from '../models/Student.js';
import { checkPlagiarism, generatePlagiarismReport, calculateSimilarity } from '../services/plagiarismService.js';

// @desc    Check plagiarism for a specific submission
// @route   GET /api/plagiarism/submission/:submissionId
export const checkSubmissionPlagiarism = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const threshold = parseInt(req.query.threshold) || 70;

    const submission = await Submission.findById(submissionId)
      .populate('studentId', 'firstName lastName studentId');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Get all other submissions for the same activity
    const otherSubmissions = await Submission.find({
      activityId: submission.activityId,
      _id: { $ne: submissionId }
    }).populate('studentId', 'firstName lastName studentId');

    // Format submissions with student names
    const formattedOthers = otherSubmissions.map(s => ({
      ...s.toObject(),
      studentName: s.studentId ? `${s.studentId.firstName} ${s.studentId.lastName}` : 'Unknown'
    }));

    const formattedSubmission = {
      ...submission.toObject(),
      studentName: submission.studentId ? `${submission.studentId.firstName} ${submission.studentId.lastName}` : 'Unknown'
    };

    const matches = checkPlagiarism(formattedSubmission, formattedOthers, threshold);

    res.json({
      success: true,
      data: {
        submission: {
          _id: submission._id,
          studentName: formattedSubmission.studentName,
          studentId: submission.studentId?.studentId,
          createdAt: submission.createdAt
        },
        threshold,
        matchesFound: matches.length,
        matches
      }
    });
  } catch (error) {
    console.error('Check submission plagiarism error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check plagiarism',
      error: error.message
    });
  }
};

// @desc    Generate plagiarism report for an activity
// @route   GET /api/plagiarism/activity/:activityId
export const getActivityPlagiarismReport = async (req, res) => {
  try {
    const { activityId } = req.params;
    const threshold = parseInt(req.query.threshold) || 70;

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    // Verify instructor owns this activity's session
    const session = await LabSession.findById(activity.labSession);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Lab session not found' });
    }

    if (session.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get all submissions for this activity (only best/latest per student)
    const allSubmissions = await Submission.find({ activityId })
      .populate('studentId', 'firstName lastName studentId')
      .sort({ createdAt: -1 });

    // Get one submission per student (the latest one)
    const studentSubmissions = new Map();
    for (const sub of allSubmissions) {
      const studentKey = sub.studentId?._id?.toString();
      if (studentKey && !studentSubmissions.has(studentKey)) {
        studentSubmissions.set(studentKey, sub);
      }
    }

    const submissions = Array.from(studentSubmissions.values()).map(s => ({
      ...s.toObject(),
      studentName: s.studentId ? `${s.studentId.firstName} ${s.studentId.lastName}` : 'Unknown'
    }));

    const report = generatePlagiarismReport(submissions, threshold);

    res.json({
      success: true,
      data: {
        activity: {
          _id: activity._id,
          title: activity.title,
          topic: activity.topic
        },
        threshold,
        report
      }
    });
  } catch (error) {
    console.error('Get activity plagiarism report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate plagiarism report',
      error: error.message
    });
  }
};

// @desc    Compare two specific submissions
// @route   GET /api/plagiarism/compare/:submissionId1/:submissionId2
export const compareSubmissions = async (req, res) => {
  try {
    const { submissionId1, submissionId2 } = req.params;

    const [sub1, sub2] = await Promise.all([
      Submission.findById(submissionId1).populate('studentId', 'firstName lastName studentId'),
      Submission.findById(submissionId2).populate('studentId', 'firstName lastName studentId')
    ]);

    if (!sub1 || !sub2) {
      return res.status(404).json({ success: false, message: 'One or both submissions not found' });
    }

    const similarity = calculateSimilarity(sub1.code, sub2.code);

    // Generate side-by-side comparison data
    const lines1 = sub1.code.split('\n');
    const lines2 = sub2.code.split('\n');

    res.json({
      success: true,
      data: {
        submission1: {
          _id: sub1._id,
          studentName: sub1.studentId ? `${sub1.studentId.firstName} ${sub1.studentId.lastName}` : 'Unknown',
          studentId: sub1.studentId?.studentId,
          code: sub1.code,
          lineCount: lines1.length,
          createdAt: sub1.createdAt
        },
        submission2: {
          _id: sub2._id,
          studentName: sub2.studentId ? `${sub2.studentId.firstName} ${sub2.studentId.lastName}` : 'Unknown',
          studentId: sub2.studentId?.studentId,
          code: sub2.code,
          lineCount: lines2.length,
          createdAt: sub2.createdAt
        },
        similarity
      }
    });
  } catch (error) {
    console.error('Compare submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare submissions',
      error: error.message
    });
  }
};

// @desc    Get plagiarism report for an entire session
// @route   GET /api/plagiarism/session/:sessionId
export const getSessionPlagiarismReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const threshold = parseInt(req.query.threshold) || 70;

    const session = await LabSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const activities = await Activity.find({ labSession: sessionId });
    const activityReports = [];

    for (const activity of activities) {
      const allSubmissions = await Submission.find({ activityId: activity._id })
        .populate('studentId', 'firstName lastName studentId')
        .sort({ createdAt: -1 });

      // Get one submission per student
      const studentSubmissions = new Map();
      for (const sub of allSubmissions) {
        const studentKey = sub.studentId?._id?.toString();
        if (studentKey && !studentSubmissions.has(studentKey)) {
          studentSubmissions.set(studentKey, sub);
        }
      }

      const submissions = Array.from(studentSubmissions.values()).map(s => ({
        ...s.toObject(),
        studentName: s.studentId ? `${s.studentId.firstName} ${s.studentId.lastName}` : 'Unknown'
      }));

      if (submissions.length >= 2) {
        const report = generatePlagiarismReport(submissions, threshold);

        if (report.flaggedPairs.length > 0) {
          activityReports.push({
            activity: {
              _id: activity._id,
              title: activity.title,
              topic: activity.topic
            },
            report
          });
        }
      }
    }

    // Calculate overall summary
    const totalFlagged = activityReports.reduce((sum, r) => sum + r.report.summary.totalFlagged, 0);
    const allSimilarities = activityReports.flatMap(r => r.report.flaggedPairs.map(p => p.similarity));

    res.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title
        },
        threshold,
        summary: {
          activitiesWithFlags: activityReports.length,
          totalActivities: activities.length,
          totalFlaggedPairs: totalFlagged,
          maxSimilarity: allSimilarities.length > 0 ? Math.max(...allSimilarities) : 0,
          avgSimilarity: allSimilarities.length > 0
            ? Math.round(allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length)
            : 0
        },
        activityReports
      }
    });
  } catch (error) {
    console.error('Get session plagiarism report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate session plagiarism report',
      error: error.message
    });
  }
};
