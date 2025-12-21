import Submission from '../models/Submission.js';
import Activity from '../models/Activity.js';
import TestCase from '../models/TestCase.js';
import TestResult from '../models/TestResult.js';
import Student from '../models/Student.js';
import StudentTwin from '../models/StudentTwin.js';
import StudentCompetency from '../models/StudentCompetency.js';
import { runTestCases, executeCode, LANGUAGE_IDS } from '../services/judge0Service.js';

// @desc    Submit code for an activity
// @route   POST /api/submissions
export const submitCode = async (req, res) => {
  try {
    const { activityId, code, language, timeSpent } = req.body;

    // Get student profile
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    // Get activity with test cases
    const activity = await Activity.findById(activityId).populate('testCases');
    if (!activity || !activity.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found or is no longer available'
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

    // Get test cases
    const testCases = await TestCase.getByActivity(activityId);
    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No test cases defined for this activity'
      });
    }

    // Run code against test cases
    console.log('Running test cases...');
    const testCasesForJudge = testCases.map(tc => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput
    }));
    const judgeResults = await runTestCases(code, languageId, testCasesForJudge);

    // Calculate score using weights
    const totalWeight = testCases.reduce((sum, tc) => sum + tc.weight, 0);
    let earnedWeight = 0;
    const testResultsData = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const result = judgeResults[i];

      if (result.passed) {
        earnedWeight += tc.weight;
      }

      testResultsData.push({
        testCaseId: tc._id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.actualOutput || '',
        passed: result.passed,
        executionTime: parseFloat(result.executionTime) || 0,
        memoryUsed: result.memory || 0,
        errorMessage: result.stderr || result.compileOutput || null,
        stderr: result.stderr || null,
        compileOutput: result.compileOutput || null
      });
    }

    const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    const passedTests = testResultsData.filter(r => r.passed).length;

    // Determine overall status
    let status = 'failed';
    let compileError = null;
    let runtimeError = null;

    if (passedTests === testCases.length) {
      status = 'passed';
    } else if (judgeResults.some(r => r.compileOutput)) {
      status = 'error';
      compileError = judgeResults.find(r => r.compileOutput)?.compileOutput;
    } else if (judgeResults.some(r => r.stderr)) {
      status = 'error';
      runtimeError = judgeResults.find(r => r.stderr)?.stderr;
    }

    // Calculate total execution time
    const executionTime = testResultsData.reduce((sum, r) => sum + r.executionTime, 0);

    // Get attempt number
    const previousSubmissions = await Submission.countDocuments({
      studentId: studentProfile._id,
      activityId: activityId
    });

    // Create submission (labSessionId is set automatically by pre-save hook)
    const submission = await Submission.create({
      studentId: studentProfile._id,
      activityId: activityId,
      labSessionId: activity.labSession,
      code,
      language,
      status,
      score,
      executionTime,
      attemptNumber: previousSubmissions + 1,
      timeSpent: timeSpent || 0,
      compileError,
      runtimeError
    });

    // Create test results
    await TestResult.createForSubmission(submission._id, testResultsData);

    // Update best score
    await Submission.updateBestScore(studentProfile._id, activityId);

    // Update student competency and twin
    if (activity.topic) {
      await StudentCompetency.updateFromSubmission(
        studentProfile._id,
        activity.topic,
        status === 'passed'
      );

      const twin = await StudentTwin.getOrCreate(studentProfile._id);
      await twin.recordActivity(status === 'passed', 0);
      await twin.updateInsights();
    }

    // Get test results for response
    const testResults = await TestResult.getBySubmission(submission._id);

    // Build test execution log for frontend compatibility
    const testExecutionLog = testResults.map((result, index) => ({
      testCase: index + 1,
      step: result.passed ? 'PASSED' : 'FAILED',
      timestamp: result.createdAt,
      output: result.actualOutput || result.compileOutput || result.errorMessage || 'No output',
      expected: result.expectedOutput,
      input: result.input
    }));

    // Populate activity details
    await submission.populate('activityId', 'title topic difficulty');

    res.status(201).json({
      success: true,
      message: status === 'passed' ? 'All tests passed!' : 'Some tests failed',
      data: {
        compileError,
        runtimeError,
        testExecutionLog,
        testResults,
        score,
        status,
        submission
      }
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
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.json({
        success: true,
        count: 0,
        stats: { totalAttempts: 0, bestScore: 0, averageScore: 0, passed: false },
        data: []
      });
    }

    const submissions = await Submission.find({
      studentId: studentProfile._id,
      activityId: req.params.activityId
    })
      .sort({ createdAt: -1 })
      .select('-code');

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
      .populate('activityId', 'title description topic difficulty')
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'firstName lastName email' }
      });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check if user owns this submission or is instructor
    const studentProfile = await Student.findOne({ userId: req.user._id });
    const isOwner = studentProfile && submission.studentId._id.toString() === studentProfile._id.toString();

    if (!isOwner && req.user.role !== 'instructor') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      });
    }

    // Get test results
    const testResults = await TestResult.getBySubmission(submission._id);

    res.json({
      success: true,
      data: {
        ...submission.toObject(),
        testResults
      }
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
    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const submissions = await Submission.find({ studentId: studentProfile._id })
      .populate('activityId', 'title topic difficulty type')
      .sort({ createdAt: -1 })
      .select('-code');

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

// @desc    Compare two submissions
// @route   GET /api/submissions/compare/:id1/:id2
export const compareSubmissions = async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    const studentProfile = await Student.findOne({ userId: req.user._id });
    if (!studentProfile) {
      return res.status(403).json({
        success: false,
        message: 'Student profile not found'
      });
    }

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
    if (submission1.studentId.toString() !== studentProfile._id.toString() ||
        submission2.studentId.toString() !== studentProfile._id.toString()) {
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

// @desc    Run code in sandbox mode (no test cases, just execute)
// @route   POST /api/submissions/sandbox
export const runSandbox = async (req, res) => {
  try {
    const { code, language, stdin = '' } = req.body;

    // Validate required fields
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code and language are required'
      });
    }

    // Get language ID for Judge0
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid programming language. Supported: python, java, cpp'
      });
    }

    // Execute the code
    const result = await executeCode(code, languageId, stdin);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Code execution failed'
      });
    }

    const data = result.data;

    // Parse execution time safely
    const execTimeRaw = data?.time || '0';
    const executionTime = parseFloat(
      execTimeRaw.toString().match(/\d+(\.\d+)?/)?.[0] || 0
    );

    res.json({
      success: true,
      data: {
        output: data?.stdout || '',
        stderr: data?.stderr || '',
        compileOutput: data?.compile_output || '',
        status: data?.status?.description || 'Unknown',
        statusId: data?.status?.id,
        executionTime,
        memory: data?.memory || 0,
        // Determine if there was an error
        hasError: data?.status?.id !== 3, // 3 = Accepted
        errorType: data?.compile_output ? 'compile' : (data?.stderr ? 'runtime' : null)
      }
    });
  } catch (error) {
    console.error('Sandbox execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Sandbox execution failed',
      error: error.message
    });
  }
};
