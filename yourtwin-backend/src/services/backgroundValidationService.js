import Submission from '../models/Submission.js';
import Activity from '../models/Activity.js';
import TestCase from '../models/TestCase.js';
import { validateCodeWithAI } from './ollamaService.js';
import { emitToLabSession, emitToAllInstructors } from '../utils/socket.js';
import { analyzeCode } from '../utils/codeAnalyzer.js';

// Queue for background validation
let validationQueue = [];
let isProcessing = false;

/**
 * Add a submission to the background validation queue
 */
export const queueForValidation = (submissionId) => {
  if (!validationQueue.includes(submissionId.toString())) {
    validationQueue.push(submissionId.toString());
    // Reduced logging - only log queue size if > 1
    if (validationQueue.length > 1) {
      console.log(`📋 [Queue] ${validationQueue.length} submissions pending`);
    }
    processQueue();
  }
};

/**
 * Process the validation queue
 */
const processQueue = async () => {
  if (isProcessing || validationQueue.length === 0) return;

  isProcessing = true;
  const submissionId = validationQueue.shift();

  try {
    await validateSubmission(submissionId);
  } catch (error) {
    console.error(`❌ [Background Validation] Error processing ${submissionId}:`, error.message);
  }

  isProcessing = false;

  // Process next item
  if (validationQueue.length > 0) {
    // Small delay to prevent overwhelming Ollama
    setTimeout(processQueue, 500);
  }
};

/**
 * Validate a single submission
 */
const validateSubmission = async (submissionId) => {
  const submission = await Submission.findById(submissionId)
    .populate('activityId')
    .populate('studentId');

  if (!submission) {
    return;
  }

  // Skip if already validated
  if (submission.validationStatus !== 'pending') {
    return;
  }

  // Skip if not passed (no need to validate failed submissions)
  if (submission.status !== 'passed') {
    await Submission.findByIdAndUpdate(submissionId, {
      validationStatus: 'skipped'
    });
    return;
  }

  // Get activity and test cases
  const activity = await Activity.findById(submission.activityId);
  if (!activity) {
    return;
  }

  const testCases = await TestCase.getByActivity(activity._id);
  if (testCases.length === 0) {
    await Submission.findByIdAndUpdate(submissionId, {
      validationStatus: 'skipped'
    });
    return;
  }

  // STEP 1: Run static code analysis FIRST (fast and reliable)
  const staticAnalysis = analyzeCode(
    submission.code,
    submission.language,
    testCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
    activity.type
  );

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('🔬 [Static Analysis] Results:');
  console.log(`   ├─ Suspicion Score: ${staticAnalysis.suspicionScore}/100`);
  console.log(`   ├─ Is Suspicious: ${staticAnalysis.isSuspicious ? '🚨 YES' : '✓ No'}`);
  console.log(`   └─ Flags: ${staticAnalysis.flags.map(f => f.type).join(', ') || 'None'}`);

  // If static analysis flags with HIGH confidence (score >= 50), trust it immediately
  const criticalFlags = staticAnalysis.flags.filter(f => f.severity === 'critical' || f.severity === 'high');
  const staticFlagged = staticAnalysis.suspicionScore >= 50 || criticalFlags.length > 0;

  let aiValidation = null;
  let useStaticResult = false;

  if (staticFlagged) {
    console.log('🚨 [Static Analysis] HIGH CONFIDENCE WORKAROUND DETECTED - Skipping AI');
    useStaticResult = true;

    // Create a synthetic AI validation result from static analysis
    aiValidation = {
      isLegitimate: false,
      followsInstructions: false,
      isHardcoded: true,
      confidence: Math.min(staticAnalysis.suspicionScore + 10, 100),
      issues: staticAnalysis.flags.map(f => f.description),
      explanation: `Static analysis detected: ${staticAnalysis.flags.map(f => f.type).join(', ')}`,
      responseTime: 0,
      model: 'static-analysis'
    };
  } else {
    // STEP 2: Run AI validation only if static analysis is uncertain
    try {
      aiValidation = await validateCodeWithAI(
        submission.code,
        submission.language,
        testCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })),
        activity.description || activity.title
      );

      if (!aiValidation) {
        // AI unavailable - use static analysis result if it found anything
        if (staticAnalysis.suspicionScore >= 30) {
          console.log('⚠️ [AI Validation] Unavailable, using static analysis result');
          aiValidation = {
            isLegitimate: !staticAnalysis.isSuspicious,
            followsInstructions: true,
            isHardcoded: staticAnalysis.isSuspicious,
            confidence: staticAnalysis.suspicionScore,
            issues: staticAnalysis.flags.map(f => f.description),
            explanation: 'Based on static analysis (AI unavailable)',
            responseTime: 0,
            model: 'static-analysis-fallback'
          };
        } else {
          // Don't mark as skipped - keep pending so it can be retried
          return;
        }
      }
    } catch (err) {
      console.error('❌ [AI Validation] Error:', err.message);
      return;
    }
  }

  // Determine validation status
  const isFlagged = !aiValidation.isLegitimate && aiValidation.confidence >= 60;
  const validationStatus = isFlagged ? 'flagged' : 'validated';

  // Build update object
  const updateData = {
    validationStatus,
    'codeAnalysis.aiValidation': {
      isLegitimate: aiValidation.isLegitimate,
      followsInstructions: aiValidation.followsInstructions ?? true,
      isHardcoded: aiValidation.isHardcoded ?? false,
      confidence: aiValidation.confidence,
      explanation: aiValidation.explanation,
      issues: aiValidation.issues || [],
      responseTime: aiValidation.responseTime,
      model: aiValidation.model || 'unknown',
      validatedAt: new Date()
    }
  };

  // If flagged, also update suspicion data
  if (isFlagged) {
    updateData['codeAnalysis.isSuspicious'] = true;
    updateData['codeAnalysis.suspicionScore'] = Math.max(
      submission.codeAnalysis?.suspicionScore || 0,
      aiValidation.confidence
    );

    // Add AI flag if not already present
    const existingFlags = submission.codeAnalysis?.flags || [];
    const hasAIFlag = existingFlags.some(f => f.type === 'ai_detected_workaround');

    if (!hasAIFlag) {
      updateData.$push = {
        'codeAnalysis.flags': {
          type: 'ai_detected_workaround',
          severity: aiValidation.confidence >= 85 ? 'high' : 'medium',
          description: `AI detected: ${(aiValidation.issues || []).join(', ') || aiValidation.explanation}`
        }
      };
    }
  }

  // Update the submission
  await Submission.findByIdAndUpdate(submissionId, updateData);

  // Log final verdict
  const verdict = isFlagged ? '🚨 FLAGGED' : '✅ VALIDATED';
  console.log(`📊 [Validation] Final: ${verdict} (confidence: ${aiValidation.confidence}%)`);
  console.log('════════════════════════════════════════════════════════════\n');

  // Emit real-time update to instructors if flagged
  if (isFlagged) {
    const eventData = {
      submissionId: submission._id,
      studentId: submission.studentId?._id,
      studentName: submission.studentId?.userId ?
        `${submission.studentId.userId.firstName} ${submission.studentId.userId.lastName}` :
        'Unknown',
      activityId: activity._id,
      activityTitle: activity.title,
      labSessionId: activity.labSession,
      validationStatus: 'flagged',
      confidence: aiValidation.confidence,
      issues: aiValidation.issues,
      explanation: aiValidation.explanation,
      timestamp: new Date()
    };

    // Emit to lab session and all instructors
    emitToLabSession(activity.labSession, 'submission-flagged', eventData);
    emitToAllInstructors('submission-flagged', eventData);
  }
};

/**
 * Retry pending validations (called on server startup or periodically)
 */
export const retryPendingValidations = async () => {
  try {
    const pendingSubmissions = await Submission.find({
      status: 'passed',
      validationStatus: 'pending',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).limit(50);

    if (pendingSubmissions.length > 0) {
      for (const submission of pendingSubmissions) {
        queueForValidation(submission._id);
      }
    }
  } catch (error) {
    console.error('❌ [Background Validation] Retry error:', error.message);
  }
};

/**
 * Get queue status
 */
export const getValidationQueueStatus = () => ({
  queueLength: validationQueue.length,
  isProcessing
});

/**
 * Force revalidate a submission
 */
export const forceRevalidate = async (submissionId) => {
  await Submission.findByIdAndUpdate(submissionId, {
    validationStatus: 'pending',
    'codeAnalysis.aiValidation': null
  });
  queueForValidation(submissionId);
};

export default {
  queueForValidation,
  retryPendingValidations,
  getValidationQueueStatus,
  forceRevalidate
};
