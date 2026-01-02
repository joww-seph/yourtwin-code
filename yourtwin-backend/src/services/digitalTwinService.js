/**
 * DIGITAL TWIN SERVICE - MIRROR TWIN OPERATIONS
 *
 * This service provides comprehensive analysis of the MIRROR TWIN -
 * the exact replica of the student's learning data, behavioral patterns,
 * and cognitive profile.
 *
 * DIGITAL TWIN ARCHITECTURE:
 * - MIRROR TWIN (this service + StudentTwin model): Contains all learning data,
 *   competency tracking, behavioral patterns, AI dependency metrics, and
 *   velocity trends. Used to determine personalized learning paths.
 *
 * - SHADOW TWIN (shadowTwinEngine.js): The cognitive opposite of the student.
 *   Where the student has weaknesses, the Shadow Twin has strengths.
 *   Powers the 5-level hint system.
 *
 * This service analyzes the Mirror Twin data to provide:
 * - Learning velocity and trends
 * - AI dependency patterns
 * - Personalized recommendations
 * - Coding behavior analysis
 */

import StudentTwin from '../models/StudentTwin.js';
import StudentCompetency from '../models/StudentCompetency.js';
import HintRequest from '../models/HintRequest.js';
import AIUsage from '../models/AIUsage.js';
import Submission from '../models/Submission.js';
import CodeSnapshot from '../models/CodeSnapshot.js';
import mindsporeBridge from './mindsporeBridge.js';

/**
 * Get comprehensive Digital Twin analysis for a student
 *
 * Combines Mirror Twin data with MindSpore ML predictions for enhanced insights.
 */
export const getDigitalTwinAnalysis = async (studentId) => {
  // Get or create the twin
  const twin = await StudentTwin.getOrCreate(studentId);

  // Get full analysis from twin
  const fullAnalysis = await twin.getFullAnalysis();

  // Get competency summary
  const competencySummary = await StudentCompetency.getSummary(studentId);

  // Get AI usage stats
  const aiStats = await AIUsage.getStudentStats(studentId);

  // Get hint effectiveness
  const hintStats = await getHintEffectiveness(studentId);

  // Get ML insights from MindSpore (runs in parallel)
  let mlInsights = null;
  try {
    const [predictions, anomalies, learningPath] = await Promise.all([
      mindsporeBridge.predictStudentOutcome(studentId.toString()),
      mindsporeBridge.detectAnomalies(studentId.toString()),
      mindsporeBridge.getOptimalLearningPath(studentId.toString())
    ]);

    mlInsights = {
      predictedSuccess: predictions,
      anomalyFlags: anomalies,
      recommendedPath: learningPath,
      available: true
    };
  } catch (error) {
    console.log('ML insights unavailable:', error.message);
    mlInsights = { available: false };
  }

  return {
    ...fullAnalysis,
    competencySummary,
    aiUsageStats: {
      totalRequests: aiStats.totalRequests,
      successfulRequests: aiStats.successfulRequests,
      avgResponseTime: Math.round(aiStats.avgResponseTime),
      hintsByLevel: calculateHintLevelDistribution(aiStats.hintsByLevel || [])
    },
    hintEffectiveness: hintStats,
    mlInsights
  };
};

/**
 * Analyze AI dependency patterns for a student
 */
export const analyzeAIDependency = async (studentId) => {
  const twin = await StudentTwin.getOrCreate(studentId);

  // Get recent submissions and hint usage
  const recentSubmissions = await Submission.find({ studentId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const recentHints = await HintRequest.find({ studentId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Calculate dependency metrics
  const submissionsWithHints = new Set();
  const submissionsWithoutHints = new Set();

  for (const submission of recentSubmissions) {
    const activityId = submission.activityId.toString();
    const hasHintForActivity = recentHints.some(
      h => h.activityId.toString() === activityId
    );

    if (hasHintForActivity) {
      submissionsWithHints.add(activityId);
    } else {
      submissionsWithoutHints.add(activityId);
    }
  }

  // Calculate trend over time windows
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

  const recentWeekHints = recentHints.filter(h => new Date(h.createdAt) > oneWeekAgo).length;
  const previousWeekHints = recentHints.filter(
    h => new Date(h.createdAt) > twoWeeksAgo && new Date(h.createdAt) <= oneWeekAgo
  ).length;

  // Determine trend
  let dependencyTrend = 'stable';
  if (recentWeekHints > previousWeekHints * 1.3) {
    dependencyTrend = 'increasing';
  } else if (recentWeekHints < previousWeekHints * 0.7) {
    dependencyTrend = 'decreasing';
  }

  // Calculate hint level progression
  const hintLevelUsage = {};
  for (const hint of recentHints) {
    const level = hint.hintLevel || 1;
    hintLevelUsage[level] = (hintLevelUsage[level] || 0) + 1;
  }

  // Calculate success rate with vs without hints
  const passedWithHints = recentSubmissions.filter(
    s => s.status === 'passed' && submissionsWithHints.has(s.activityId.toString())
  ).length;
  const passedWithoutHints = recentSubmissions.filter(
    s => s.status === 'passed' && submissionsWithoutHints.has(s.activityId.toString())
  ).length;

  return {
    dependencyScore: Math.round(twin.behavioralData.aiDependencyScore * 100),
    dependencyTrend,
    totalHintsUsed: recentHints.length,
    recentWeekHints,
    previousWeekHints,
    hintLevelUsage,
    successRates: {
      withHints: submissionsWithHints.size > 0
        ? Math.round((passedWithHints / submissionsWithHints.size) * 100)
        : 0,
      withoutHints: submissionsWithoutHints.size > 0
        ? Math.round((passedWithoutHints / submissionsWithoutHints.size) * 100)
        : 0
    },
    recommendation: generateDependencyRecommendation(
      twin.behavioralData.aiDependencyScore,
      dependencyTrend
    )
  };
};

/**
 * Get personalized learning recommendations
 */
export const getLearningRecommendations = async (studentId) => {
  const twin = await StudentTwin.getOrCreate(studentId);
  const competencies = await StudentCompetency.find({ studentId });

  const recommendations = [];

  // Recommendation based on weaknesses
  if (twin.weaknesses && twin.weaknesses.length > 0) {
    recommendations.push({
      type: 'weakness',
      priority: 'high',
      title: 'Focus on Weak Areas',
      description: `You need more practice with: ${twin.weaknesses.join(', ')}`,
      topics: twin.weaknesses
    });
  }

  // Recommendation based on AI dependency
  if (twin.behavioralData.aiDependencyScore > 0.6) {
    recommendations.push({
      type: 'independence',
      priority: 'medium',
      title: 'Build Independence',
      description: 'Try solving more problems without AI hints to strengthen your problem-solving skills.',
      actionItems: [
        'Attempt at least 3 problems without hints this week',
        'Review lecture notes before asking for help',
        'Use pseudocode to plan your approach first'
      ]
    });
  }

  // Recommendation based on learning velocity
  if (twin.learningVelocity < 30) {
    recommendations.push({
      type: 'velocity',
      priority: 'medium',
      title: 'Boost Your Progress',
      description: 'Your learning velocity is below optimal. Consider these strategies:',
      actionItems: [
        'Practice regularly rather than in bursts',
        'Review and understand errors before moving on',
        'Start with easier problems to build confidence'
      ]
    });
  }

  // Recommendation based on competency decay
  const decayedCompetencies = competencies.filter(c => {
    if (!c.lastAttemptAt) return false;
    const daysSince = (Date.now() - c.lastAttemptAt) / (1000 * 60 * 60 * 24);
    return daysSince > 7 && c.proficiencyLevel > 0.3;
  });

  if (decayedCompetencies.length > 0) {
    recommendations.push({
      type: 'review',
      priority: 'high',
      title: 'Skills Need Review',
      description: 'These topics haven\'t been practiced recently and may be getting rusty:',
      topics: decayedCompetencies.map(c => c.topic)
    });
  }

  // Recommendation for advancement
  if (twin.difficultyStats.medium?.completed >= 5 && twin.difficultyStats.hard?.completed < 2) {
    recommendations.push({
      type: 'challenge',
      priority: 'low',
      title: 'Ready for More Challenge',
      description: 'You\'ve done well with medium problems. Try some hard ones!',
      actionItems: [
        'Attempt 2 hard problems this week',
        'Don\'t worry about failing - it\'s part of learning'
      ]
    });
  }

  return recommendations;
};

/**
 * Get hint effectiveness statistics
 */
const getHintEffectiveness = async (studentId) => {
  const hints = await HintRequest.find({ studentId }).lean();

  if (hints.length === 0) {
    return {
      totalHints: 0,
      successfulHints: 0,
      effectivenessRate: 0,
      avgHintLevel: 0
    };
  }

  const successfulHints = hints.filter(h => h.ledToSuccess).length;
  const avgHintLevel = hints.reduce((sum, h) => sum + (h.hintLevel || 1), 0) / hints.length;

  return {
    totalHints: hints.length,
    successfulHints,
    effectivenessRate: Math.round((successfulHints / hints.length) * 100),
    avgHintLevel: Math.round(avgHintLevel * 10) / 10,
    byLevel: calculateHintEffectivenessByLevel(hints)
  };
};

/**
 * Calculate hint level distribution
 */
const calculateHintLevelDistribution = (hintLevels) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const level of hintLevels) {
    if (level >= 1 && level <= 5) {
      distribution[level]++;
    }
  }

  return distribution;
};

/**
 * Calculate hint effectiveness by level
 */
const calculateHintEffectivenessByLevel = (hints) => {
  const byLevel = {};

  for (let level = 1; level <= 5; level++) {
    const levelHints = hints.filter(h => h.hintLevel === level);
    if (levelHints.length > 0) {
      const successful = levelHints.filter(h => h.ledToSuccess).length;
      byLevel[level] = {
        total: levelHints.length,
        successful,
        rate: Math.round((successful / levelHints.length) * 100)
      };
    }
  }

  return byLevel;
};

/**
 * Generate dependency recommendation
 */
const generateDependencyRecommendation = (score, trend) => {
  if (score < 0.2) {
    return {
      level: 'excellent',
      message: 'Great job! You\'re solving problems independently.',
      color: 'green'
    };
  } else if (score < 0.4) {
    return {
      level: 'good',
      message: 'Good balance between seeking help and independent work.',
      color: 'blue'
    };
  } else if (score < 0.6) {
    if (trend === 'decreasing') {
      return {
        level: 'improving',
        message: 'You\'re becoming more independent - keep it up!',
        color: 'yellow'
      };
    }
    return {
      level: 'moderate',
      message: 'Consider attempting more problems before asking for hints.',
      color: 'yellow'
    };
  } else {
    if (trend === 'increasing') {
      return {
        level: 'high',
        message: 'You\'re relying heavily on AI hints. Try solving problems independently first.',
        color: 'orange'
      };
    }
    return {
      level: 'high',
      message: 'Building problem-solving skills requires struggling through challenges. Try without hints!',
      color: 'red'
    };
  }
};

/**
 * Get coding behavior analysis
 */
export const getCodingBehaviorAnalysis = async (studentId, activityId = null) => {
  const query = { studentId };
  if (activityId) query.activityId = activityId;

  const snapshots = await CodeSnapshot.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (snapshots.length === 0) {
    return {
      totalSnapshots: 0,
      codingStyle: 'unknown',
      avgEditFrequency: 0,
      pastePatterns: null
    };
  }

  // Analyze paste patterns
  const totalPastes = snapshots.reduce(
    (sum, s) => sum + (s.behavioralContext?.pasteEventsSinceLastSnapshot || 0), 0
  );
  const avgPastesPerSession = totalPastes / snapshots.length;

  // Analyze coding rhythm
  const intervals = [];
  for (let i = 1; i < snapshots.length; i++) {
    const timeDiff = new Date(snapshots[i - 1].createdAt) - new Date(snapshots[i].createdAt);
    intervals.push(timeDiff / 1000); // in seconds
  }

  const avgInterval = intervals.length > 0
    ? intervals.reduce((a, b) => a + b, 0) / intervals.length
    : 0;

  // Determine coding rhythm pattern
  let codingRhythm = 'unknown';
  if (avgInterval < 60) {
    codingRhythm = 'rapid_iteration';
  } else if (avgInterval < 180) {
    codingRhythm = 'steady';
  } else if (avgInterval < 600) {
    codingRhythm = 'thoughtful';
  } else {
    codingRhythm = 'sporadic';
  }

  return {
    totalSnapshots: snapshots.length,
    avgEditFrequency: Math.round(avgInterval),
    codingRhythm,
    pastePatterns: {
      avgPastesPerSession: Math.round(avgPastesPerSession * 10) / 10,
      classification: avgPastesPerSession < 1 ? 'minimal' :
        avgPastesPerSession < 3 ? 'moderate' : 'frequent'
    },
    recentActivity: snapshots.slice(0, 5).map(s => ({
      activityId: s.activityId,
      type: s.snapshotType,
      linesAdded: s.diffFromPrevious?.linesAdded || 0,
      linesModified: s.diffFromPrevious?.linesModified || 0,
      timestamp: s.createdAt
    }))
  };
};

export default {
  getDigitalTwinAnalysis,
  analyzeAIDependency,
  getLearningRecommendations,
  getCodingBehaviorAnalysis
};
