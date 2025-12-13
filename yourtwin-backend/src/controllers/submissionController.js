import Submission from '../models/Submission.js';
import Activity from '../models/Activity.js';
import StudentTwin from '../models/StudentTwin.js';
import { runTestCases, LANGUAGE_IDS } from '../services/judge0Service.js';

// @desc    Submit code for an activity
// @route   POST /api/submissions
export const submitCode = async (req, res) => {
  try {
    const { activityId, code, language, timeSpent } = req.body;
    const studentId = req.user._id;

    // Get activity with test cases
    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }

    // Get language ID for Judge0
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid programming language'
      });
    }

    // Run code against test cases
    console.log('Running test cases...');
    const testResults = await runTestCases(code, languageId, activity.testCases);

    // Calculate score
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const score = Math.round((passedTests / totalTests) * 100);

    // Determine overall status
    let status = 'failed';
    let compileError = null;
    let runtimeError = null;

    if (passedTests === totalTests) {
      status = 'passed';
    } else if (testResults.some(r => r.compileOutput)) {
      status = 'error';
      compileError = testResults.find(r => r.compileOutput)?.compileOutput;
    } else if (testResults.some(r => r.stderr)) {
      status = 'error';
      runtimeError = testResults.find(r => r.stderr)?.stderr;
    }

    // Calculate total execution time
    const executionTime = testResults.reduce((sum, r) => sum + (parseFloat(r.executionTime) || 0), 0);

    // Get attempt number
    const previousSubmissions = await Submission.countDocuments({
      student: studentId,
      activity: activityId
    });

    // Create submission
    const submission = await Submission.create({
      student: studentId,
      activity: activityId,
      code,
      language,
      status,
      testResults,
      score,
      executionTime: executionTime.toFixed(3),
      attemptNumber: previousSubmissions + 1,
      timeSpent: timeSpent || 0,
      compileError,
      runtimeError
    });

    // Update best score
    await Submission.updateBestScore(studentId, activityId);

    // Update student twin (if activity completed successfully)
    if (status === 'passed') {
      await updateStudentTwin(studentId, activity, submission);
    }

    // Populate activity details
    await submission.populate('activity', 'title topic difficulty');

    res.status(201).json({
      success: true,
      message: status === 'passed' ? 'All tests passed! 🎉' : 'Some tests failed',
      data: submission
    });
  } catch (error) {
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Submission failed',
      error: error.message
    });
  }
};

// @desc    Get my submissions for an activity
// @route   GET /api/submissions/activity/:activityId
export const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user._id,
      activity: req.params.activityId
    })
      .sort({ createdAt: -1 })
      .select('-code'); // Don't send code in list view

    // Get statistics
    const stats = {
      totalAttempts: submissions.length,
      bestScore: submissions.length > 0 ? Math.max(...submissions.map(s => s.score)) : 0,
      averageScore: submissions.length > 0 
        ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length)
        : 0,
      passed: submissions.some(s => s.status === 'passed')
    };

    res.json({
      success: true,
      count: submissions.length,
      stats,
      data: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

// @desc    Get single submission with code
// @route   GET /api/submissions/:id
export const getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('activity', 'title description topic difficulty')
      .populate('student', 'name email studentId');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns this submission
    if (submission.student._id.toString() !== req.user._id.toString() && req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission',
      error: error.message
    });
  }
};

// @desc    Get all my submissions
// @route   GET /api/submissions/my
export const getAllMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('activity', 'title topic difficulty type')
      .sort({ createdAt: -1 })
      .select('-code');

    // Group by activity
    const groupedSubmissions = submissions.reduce((acc, sub) => {
      const activityId = sub.activity._id.toString();
      if (!acc[activityId]) {
        acc[activityId] = {
          activity: sub.activity,
          submissions: [],
          bestScore: 0,
          totalAttempts: 0,
          status: 'not_started'
        };
      }
      acc[activityId].submissions.push(sub);
      acc[activityId].totalAttempts++;
      acc[activityId].bestScore = Math.max(acc[activityId].bestScore, sub.score);
      if (sub.status === 'passed') {
        acc[activityId].status = 'completed';
      } else if (acc[activityId].status !== 'completed') {
        acc[activityId].status = 'in_progress';
      }
      return acc;
    }, {});

    res.json({
      success: true,
      count: Object.keys(groupedSubmissions).length,
      data: Object.values(groupedSubmissions)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};

// @desc    Compare two submissions
// @route   GET /api/submissions/compare/:id1/:id2
export const compareSubmissions = async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    const [submission1, submission2] = await Promise.all([
      Submission.findById(id1),
      Submission.findById(id2)
    ]);

    if (!submission1 || !submission2) {
      return res.status(404).json({
        success: false,
        message: 'One or both submissions not found'
      });
    }

    // Verify ownership
    if (submission1.student.toString() !== req.user._id.toString() ||
        submission2.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.json({
      success: true,
      data: {
        submission1,
        submission2,
        comparison: {
          scoreDiff: submission2.score - submission1.score,
          timeDiff: submission2.executionTime - submission1.executionTime,
          attemptDiff: submission2.attemptNumber - submission1.attemptNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to compare submissions',
      error: error.message
    });
  }
};

// Helper function to update student twin
async function updateStudentTwin(studentId, activity, submission) {
  try {
    let twin = await StudentTwin.findOne({ student: studentId });
    
    if (!twin) {
      twin = await StudentTwin.create({
        student: studentId,
        competencies: []
      });
    }

    // Update competency for this topic
    const topicCompetency = twin.competencies.find(c => c.topic === activity.topic);
    
    if (topicCompetency) {
      // Increase competency based on score and attempts
      const improvement = (submission.score / 100) * 0.1 / submission.attemptNumber;
      topicCompetency.level = Math.min(1, topicCompetency.level + improvement);
      topicCompetency.lastUpdated = new Date();
    } else {
      twin.competencies.push({
        topic: activity.topic,
        level: (submission.score / 100) * 0.3, // Start at 30% of score
        lastUpdated: new Date()
      });
    }

    twin.totalActivitiesCompleted += 1;
    twin.lastActivityDate = new Date();
    
    await twin.save();
  } catch (error) {
    console.error('Error updating student twin:', error);
  }
}