import StudentTwin from '../models/StudentTwin.js';
import StudentCompetency from '../models/StudentCompetency.js';
import Submission from '../models/Submission.js';
import HintRequest from '../models/HintRequest.js';
import { buildRefusalMessage } from '../templates/hintPrompts.js';

// Minimum time before first hint (in seconds)
const MIN_TIME_FOR_FIRST_HINT = 60; // 1 minute (reduced for better UX)

// Hint level unlock criteria (more lenient for better UX)
const UNLOCK_CRITERIA = {
  2: { attempts: 1, timeMinutes: 3 },
  3: { attempts: 2, timeMinutes: 5, requiresPrevious: true },
  4: { attempts: 3, timeMinutes: 10, requiresPrevious: true },
  5: { attempts: 4, timeMinutes: 15, requiresPrevious: true, requiresComprehension: true }
};

// Maximum hints per activity
const MAX_HINTS_PER_ACTIVITY = 10;

// Evaluate if a hint request should be granted
export const evaluateRequest = async (context) => {
  const {
    studentId,
    activityId,
    requestedLevel,
    aiAssistanceLevel, // Activity's max allowed level (0 = lockdown)
    timeSpentSeconds,
    currentCode,
    lastHintCode
  } = context;

  const result = {
    granted: false,
    reason: null,
    message: null,
    actualLevel: requestedLevel,
    unlockCriteriaMet: []
  };

  // Check 1: Lockdown mode
  if (aiAssistanceLevel === 0) {
    result.reason = 'lockdown';
    result.message = buildRefusalMessage('lockdown');
    return result;
  }

  // Check 2: Requested level exceeds activity's allowed level
  if (requestedLevel > aiAssistanceLevel) {
    result.reason = 'level_exceeded';
    result.message = `This activity only allows up to Level ${aiAssistanceLevel} hints.`;
    result.actualLevel = aiAssistanceLevel;
  }

  // Get student data
  const [submissions, hintCount, highestLevel, studentTwin, competencies] = await Promise.all([
    Submission.countDocuments({ studentId: studentId, activityId: activityId }),
    HintRequest.countHintsUsed(studentId, activityId),
    HintRequest.getHighestLevelUsed(studentId, activityId),
    StudentTwin.findOne({ studentId: studentId }),
    StudentCompetency.find({ studentId: studentId })
  ]);

  const attemptCount = submissions;
  const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);

  // Check 3: Hint quota exceeded
  if (hintCount >= MAX_HINTS_PER_ACTIVITY) {
    result.reason = 'quota_exceeded';
    result.message = buildRefusalMessage('quotaExceeded', { count: MAX_HINTS_PER_ACTIVITY });
    return result;
  }

  // Check 4: Too soon for first hint (unless they have attempts)
  if (hintCount === 0 && attemptCount === 0 && timeSpentSeconds < MIN_TIME_FOR_FIRST_HINT) {
    result.reason = 'too_soon';
    result.message = buildRefusalMessage('tooSoon', {
      timeSpent: formatTime(timeSpentSeconds)
    });
    return result;
  }

  // Check 5: No code change since last hint
  if (lastHintCode && currentCode && lastHintCode.trim() === currentCode.trim() && hintCount > 0) {
    result.reason = 'no_code_change';
    result.message = buildRefusalMessage('noCodeChange');
    return result;
  }

  // Check 6: Level unlock criteria
  const levelToCheck = result.actualLevel || requestedLevel;

  if (levelToCheck > 1) {
    const criteria = UNLOCK_CRITERIA[levelToCheck];

    if (criteria) {
      // Check if meets attempt or time criteria
      const meetsAttempts = attemptCount >= criteria.attempts;
      const meetsTime = timeSpentMinutes >= criteria.timeMinutes;

      if (meetsAttempts) result.unlockCriteriaMet.push('attempts');
      if (meetsTime) result.unlockCriteriaMet.push('time');

      // Check if previous level was used (if required)
      if (criteria.requiresPrevious && highestLevel < levelToCheck - 1) {
        result.reason = 'level_locked';
        result.message = buildRefusalMessage('levelLocked', {
          level: levelToCheck,
          attempts: attemptCount,
          timeSpent: formatTime(timeSpentSeconds)
        });
        return result;
      }

      // Check if comprehension was passed (for Level 5)
      if (criteria.requiresComprehension) {
        const passedComprehension = await HintRequest.hasPassedComprehension(studentId, activityId);
        if (!passedComprehension && highestLevel >= 4) {
          // Get the last Level 4 hint's comprehension question
          const lastLevel4 = await HintRequest.findOne({
            studentId,
            activityId,
            hintLevel: 4,
            comprehensionPassed: { $ne: true }
          }).sort({ createdAt: -1 });

          result.reason = 'comprehension_required';
          result.message = buildRefusalMessage('comprehensionRequired', {
            question: lastLevel4?.comprehensionQuestion || 'Please explain what you learned from the last hint.'
          });
          return result;
        }
      }

      // Check if either criteria is met
      if (!meetsAttempts && !meetsTime) {
        result.reason = 'level_locked';
        result.message = buildRefusalMessage('levelLocked', {
          level: levelToCheck,
          attempts: attemptCount,
          timeSpent: formatTime(timeSpentSeconds)
        });
        return result;
      }
    }
  }

  // Check 7: High competency redirect (soft - still allow if they insist)
  if (competencies.length > 0 && hintCount === 0) {
    const avgProficiency = competencies.reduce((sum, c) => sum + c.proficiencyLevel, 0) / competencies.length;

    if (avgProficiency > 0.7 && attemptCount < 2) {
      // Don't block, but add encouragement
      result.encouragement = buildRefusalMessage('highCompetency', {
        topic: 'similar',
        similarProblem: 'previous activities'
      });
    }
  }

  // All checks passed
  result.granted = true;
  result.reason = 'approved';

  return result;
};

// Get recommended hint level based on student's situation
export const getRecommendedLevel = async (studentId, activityId, timeSpentSeconds, attemptCount) => {
  const highestUsed = await HintRequest.getHighestLevelUsed(studentId, activityId);
  const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);

  // If they haven't used any hints, start at 1
  if (highestUsed === 0) return 1;

  // Check what level they qualify for
  for (let level = 5; level >= 2; level--) {
    const criteria = UNLOCK_CRITERIA[level];
    if (attemptCount >= criteria.attempts || timeSpentMinutes >= criteria.timeMinutes) {
      // But don't skip levels
      if (level <= highestUsed + 1) {
        return Math.min(level, highestUsed + 1);
      }
    }
  }

  return Math.min(highestUsed + 1, 5);
};

// Build context for hint generation
export const buildHintContext = async (studentId, activityId, activity, code, errorOutput) => {
  const [submissions, hintHistory, studentTwin] = await Promise.all([
    Submission.find({ studentId: studentId, activityId: activityId })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
    HintRequest.getHintHistory(studentId, activityId),
    StudentTwin.findOne({ studentId: studentId }).lean()
  ]);

  // Analyze recent errors
  const recentErrors = submissions
    .filter(s => s.status === 'failed' || s.status === 'error')
    .map(s => s.testResults?.find(t => !t.passed)?.status || 'Unknown error');

  return {
    problemTitle: activity.title,
    problemDescription: activity.description,
    topic: activity.topic,
    difficulty: activity.difficulty,
    language: activity.language,
    studentCode: code || '',
    errorOutput: errorOutput || '',
    examples: activity.testCases
      ?.filter(tc => !tc.isHidden)
      ?.slice(0, 2)
      ?.map(tc => `Input: ${tc.input}\nExpected: ${tc.expectedOutput}`)
      ?.join('\n\n') || 'No examples available',
    testCases: activity.testCases
      ?.filter(tc => !tc.isHidden)
      ?.map(tc => `Input: ${tc.input} → Output: ${tc.expectedOutput}`)
      ?.join('\n') || '',
    previousHints: hintHistory.slice(0, 3).map(h => h.generatedHint).join('\n---\n'),
    recentErrors: recentErrors.join(', ') || 'None',
    learningStyle: studentTwin?.personality || 'unknown'
  };
};

// Helper: Format seconds to readable time
function formatTime(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default {
  evaluateRequest,
  getRecommendedLevel,
  buildHintContext
};
