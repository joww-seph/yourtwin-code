import Submission from '../models/Submission.js';
import Activity from '../models/Activity.js';
import { runTestCases, LANGUAGE_IDS } from '../services/judge0Service.js';

// @desc    Submit code for an activity
// @route   POST /api/submissions
export const submitCode = async (req, res) => {
  try {
    const { activityId, code, language } = req.body;
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
    if (passedTests === totalTests) {
      status = 'passed';
    } else if (testResults.some(r => r.error || r.stderr)) {
      status = 'error';
    }

    // Calculate total execution time
    const executionTime = testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);

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
      executionTime,
      attemptNumber: previousSubmissions + 1
    });

    res.status(201).json({
      success: true,
      message: status === 'passed' ? 'All tests passed!' : 'Some tests failed',
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
// @route   GET /api/submissions/my/:activityId
export const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user._id,
      activity: req.params.activityId
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      count: submissions.length,
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

// @desc    Get all my submissions
// @route   GET /api/submissions/my
export const getAllMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ student: req.user._id })
      .populate('activity', 'title topic')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: submissions.length,
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