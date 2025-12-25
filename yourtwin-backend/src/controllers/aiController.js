import Activity from '../models/Activity.js';
import Student from '../models/Student.js';
import StudentTwin from '../models/StudentTwin.js';
import HintRequest from '../models/HintRequest.js';
import AIUsage from '../models/AIUsage.js';
import * as aiService from '../services/aiService.js';
import * as requestEvaluator from '../services/requestEvaluator.js';
import { SYSTEM_PROMPT, buildHintPrompt, COMPREHENSION_PROMPT, cleanAIResponse } from '../templates/hintPrompts.js';

// Request a hint
export const requestHint = async (req, res) => {
  try {
    const { activityId, code, errorOutput, hintLevel, description, whatTried, timeSpent } = req.body;

    if (!activityId || !description) {
      return res.status(400).json({ success: false, message: 'Activity ID and description required' });
    }

    // Get student and activity in parallel
    const [student, activity] = await Promise.all([
      Student.findOne({ userId: req.user._id }),
      Activity.findById(activityId).populate('testCases')
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

    // Get last hint for code comparison
    const lastHint = await HintRequest.findOne({ studentId: student._id, activityId }).sort({ createdAt: -1 });

    // Evaluate request
    const evaluation = await requestEvaluator.evaluateRequest({
      studentId: student._id,
      activityId,
      requestedLevel: hintLevel || 1,
      aiAssistanceLevel: activity.aiAssistanceLevel,
      timeSpentSeconds: timeSpent || 0,
      currentCode: code,
      lastHintCode: lastHint?.studentCode
    });

    if (!evaluation.granted) {
      return res.json({
        success: true,
        granted: false,
        reason: evaluation.reason,
        message: evaluation.message,
        encouragement: evaluation.encouragement
      });
    }

    const level = evaluation.actualLevel || hintLevel || 1;

    // Build context and prompt
    const context = await requestEvaluator.buildHintContext(student._id, activityId, activity, code, errorOutput);
    context.studentDescription = description;
    context.whatTried = whatTried || '';

    const prompt = buildHintPrompt(level, context);

    // Generate hint
    const aiResponse = await aiService.generateCompletion(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      { temperature: 0.4, maxTokens: 600 }
    );

    console.log(`🤖 Level ${level} hint - ${aiResponse.provider} - ${aiResponse.content?.length || 0} chars`);

    if (!aiResponse.success || !aiResponse.content?.trim()) {
      await AIUsage.logUsage({
        studentId: student._id, activityId,
        provider: aiResponse.provider || 'unknown', model: 'unknown',
        requestType: 'hint', hintLevel: level, success: false,
        errorMessage: aiResponse.error || 'Empty response'
      });
      return res.status(500).json({ success: false, message: 'Failed to generate hint. Try again.' });
    }

    const hint = cleanAIResponse(aiResponse.content);

    // Generate comprehension question for levels 4-5
    const comprehensionQuestion = level >= 4 ? await generateComprehensionQuestion(hint, level) : null;

    // Save hint request
    const hintRequest = await HintRequest.create({
      studentId: student._id,
      activityId,
      hintLevel: level,
      studentDescription: description,
      studentAttempt: whatTried,
      studentCode: code,
      errorOutput,
      generatedHint: hint,
      provider: aiResponse.provider,
      model: aiResponse.model || 'unknown',
      responseTime: aiResponse.responseTime,
      tokenUsage: aiResponse.tokenUsage,
      comprehensionRequired: level >= 4,
      comprehensionQuestion,
      requestEvaluation: { granted: true, reason: evaluation.reason }
    });

    // Log usage and update twin in parallel
    await Promise.all([
      AIUsage.logUsage({
        studentId: student._id, activityId,
        provider: aiResponse.provider, model: aiResponse.model || 'unknown',
        requestType: 'hint', hintLevel: level,
        tokenUsage: aiResponse.tokenUsage, responseTime: aiResponse.responseTime,
        success: true, fallbackUsed: aiResponse.providerSelection?.fallback || false
      }),
      StudentTwin.findOneAndUpdate(
        { studentId: student._id },
        { $inc: { totalAIRequests: 1 }, lastActivityDate: new Date() },
        { upsert: true }
      )
    ]);

    res.json({
      success: true,
      granted: true,
      data: {
        hintId: hintRequest._id,
        hint,
        level,
        provider: aiResponse.provider,
        responseTime: aiResponse.responseTime,
        comprehensionRequired: level >= 4,
        comprehensionQuestion,
        encouragement: evaluation.encouragement
      }
    });
  } catch (error) {
    console.error('Hint error:', error);
    res.status(500).json({ success: false, message: 'Failed to process hint', error: error.message });
  }
};

// Submit comprehension answer
export const submitComprehension = async (req, res) => {
  try {
    const { hintId, answer } = req.body;
    if (!hintId || !answer) {
      return res.status(400).json({ success: false, message: 'Hint ID and answer required' });
    }

    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const hintRequest = await HintRequest.findOne({ _id: hintId, studentId: student._id });
    if (!hintRequest) return res.status(404).json({ success: false, message: 'Hint not found' });

    const prompt = COMPREHENSION_PROMPT
      .replace('{hint}', hintRequest.generatedHint)
      .replace('{studentAnswer}', answer);

    const aiResponse = await aiService.generateCompletion(
      [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 150 }
    );

    if (!aiResponse.success) {
      return res.status(500).json({ success: false, message: 'Failed to evaluate' });
    }

    // Parse response - look for PASS or FAIL
    const text = aiResponse.content || '';
    const passed = /PASS/i.test(text);
    const feedback = text.replace(/^(PASS|FAIL)\s*[-:.]?\s*/i, '').trim();

    await hintRequest.submitComprehension(answer, passed);

    await AIUsage.logUsage({
      studentId: student._id, activityId: hintRequest.activityId,
      provider: aiResponse.provider, model: aiResponse.model || 'unknown',
      requestType: 'comprehension', success: true
    });

    res.json({ success: true, data: { passed, feedback, attempts: hintRequest.comprehensionAttempts } });
  } catch (error) {
    console.error('Comprehension error:', error);
    res.status(500).json({ success: false, message: 'Failed to check comprehension' });
  }
};

// Get hint history
export const getHintHistory = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [hints, highestLevel] = await Promise.all([
      HintRequest.find({ studentId: student._id, activityId: req.params.activityId })
        .sort({ createdAt: -1 })
        .select('hintLevel generatedHint createdAt comprehensionPassed wasHelpful'),
      HintRequest.getHighestLevelUsed(student._id, req.params.activityId)
    ]);

    res.json({ success: true, data: { hints, count: hints.length, highestLevel } });
  } catch (error) {
    console.error('Hint history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
};

// Submit hint feedback
export const submitHintFeedback = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const hintRequest = await HintRequest.findOne({ _id: req.params.hintId, studentId: student._id });
    if (!hintRequest) return res.status(404).json({ success: false, message: 'Hint not found' });

    await hintRequest.markHelpfulness(req.body.wasHelpful);
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ success: false, message: 'Failed to record feedback' });
  }
};

// Get AI status
export const getAIStatus = async (req, res) => {
  try {
    res.json({ success: true, data: await aiService.getProvidersStatus() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get AI status' });
  }
};

// Get usage stats
export const getUsageStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const [daily, providers] = await Promise.all([
      AIUsage.getDailyStats(days),
      AIUsage.getProviderComparison()
    ]);
    res.json({ success: true, data: { daily, providers } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

// Get recommended level
export const getRecommendedLevel = async (req, res) => {
  try {
    const [student, activity] = await Promise.all([
      Student.findOne({ userId: req.user._id }),
      Activity.findById(req.params.activityId)
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });

    const [recommendedLevel, hintsUsed] = await Promise.all([
      requestEvaluator.getRecommendedLevel(
        student._id, req.params.activityId,
        parseInt(req.query.timeSpent) || 0,
        parseInt(req.query.attempts) || 0
      ),
      HintRequest.countHintsUsed(student._id, req.params.activityId)
    ]);

    res.json({
      success: true,
      data: {
        recommendedLevel: Math.min(recommendedLevel, activity.aiAssistanceLevel),
        maxAllowedLevel: activity.aiAssistanceLevel,
        hintsUsed,
        maxHints: 10,
        isLockdown: activity.aiAssistanceLevel === 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get recommended level' });
  }
};

// Generate comprehension question
async function generateComprehensionQuestion(hint, level) {
  const fallbacks = {
    4: 'In your own words, explain the main steps you need to follow.',
    5: 'What was the bug and how does the fix solve it?'
  };

  try {
    const response = await aiService.generateCompletion([
      { role: 'system', content: 'Return ONLY a single question. No intro.' },
      { role: 'user', content: `Create ONE short question (under 15 words) starting with "Why", "How", or "What" to check understanding of:\n\n"${hint.substring(0, 250)}"` }
    ], { temperature: 0.3, maxTokens: 40 });

    if (response.success && response.content) {
      const match = response.content.match(/[^.!?\n]*\?/);
      if (match?.[0]?.length > 10) return match[0].trim();
    }
  } catch { /* use fallback */ }

  return fallbacks[level] || fallbacks[4];
}

export default {
  requestHint,
  submitComprehension,
  getHintHistory,
  submitHintFeedback,
  getAIStatus,
  getUsageStats,
  getRecommendedLevel
};
