/**
 * SHADOW TWIN ENGINE
 *
 * The Shadow Twin is the COGNITIVE OPPOSITE of the student's Mirror Twin.
 * Where the student has weaknesses, the Shadow Twin has strengths.
 * Where the student has strengths, the Shadow Twin has weaknesses.
 *
 * The Shadow Twin's role is to:
 * - Conduct peer-to-peer learning with the student
 * - Provide guidance through a 5-level hint system
 * - Challenge the student's thinking with alternative perspectives
 * - Encourage metacognitive development and critical thinking
 *
 * The 5-Level Hint System:
 * - Level 1: General guidance and problem understanding
 * - Level 2: Code structure and approach suggestions
 * - Level 3: Algorithmic hints and logic assistance
 * - Level 4: Partial code examples and detailed guidance
 * - Level 5: Complete solution with comprehension check
 *
 * The Shadow Twin adapts its personality based on the Mirror Twin's data
 * to provide the most effective learning experience for each student.
 */

import StudentTwin from '../models/StudentTwin.js';
import StudentCompetency from '../models/StudentCompetency.js';
import HintRequest from '../models/HintRequest.js';
import { getDigitalTwinAnalysis, analyzeAIDependency } from './digitalTwinService.js';

/**
 * Personality Archetypes for the Shadow Twin
 */
const PERSONALITY_ARCHETYPES = {
  ENCOURAGING_MENTOR: {
    name: 'Encouraging Mentor',
    tone: 'warm and supportive',
    style: 'Uses positive reinforcement and celebrates small wins',
    hintApproach: 'Breaks down problems into smaller, achievable steps',
    forProfiles: ['beginner', 'low_confidence']
  },
  SOCRATIC_GUIDE: {
    name: 'Socratic Guide',
    tone: 'questioning and thought-provoking',
    style: 'Asks guiding questions rather than giving direct answers',
    hintApproach: 'Leads through inquiry to build understanding',
    forProfiles: ['developing', 'intermediate']
  },
  PEER_COLLABORATOR: {
    name: 'Peer Collaborator',
    tone: 'casual and collaborative',
    style: 'Discusses problems as equals, sharing insights',
    hintApproach: 'Explores solutions together, offering perspectives',
    forProfiles: ['intermediate', 'independent']
  },
  CHALLENGING_COACH: {
    name: 'Challenging Coach',
    tone: 'direct and challenging',
    style: 'Pushes for deeper understanding and optimization',
    hintApproach: 'Provides minimal hints, encourages experimentation',
    forProfiles: ['advanced', 'high_independence']
  },
  PATIENT_TEACHER: {
    name: 'Patient Teacher',
    tone: 'patient and thorough',
    style: 'Explains concepts in detail with examples',
    hintApproach: 'Provides comprehensive explanations when needed',
    forProfiles: ['struggling', 'high_dependency']
  }
};

/**
 * Get the appropriate Shadow Twin personality for a student
 */
export const getShadowTwinPersonality = async (studentId) => {
  const twin = await StudentTwin.getOrCreate(studentId);
  const analysis = await twin.getFullAnalysis();

  // Determine student profile
  const profile = determineStudentProfile(analysis);

  // Select appropriate personality
  const personality = selectPersonality(profile, analysis);

  return {
    personality,
    profile,
    adaptations: generateAdaptations(profile, analysis)
  };
};

/**
 * Determine student profile based on analysis
 */
const determineStudentProfile = (analysis) => {
  const profiles = [];

  // Learning phase
  profiles.push(analysis.learningPhase);

  // AI independence level
  if (analysis.aiDependency.independence === 'high') {
    profiles.push('high_independence');
  } else if (analysis.aiDependency.independence === 'low') {
    profiles.push('high_dependency');
  }

  // Success rate
  if (analysis.overallSuccessRate < 40) {
    profiles.push('struggling');
  } else if (analysis.overallSuccessRate > 80) {
    profiles.push('excelling');
  }

  // Learning velocity
  if (analysis.learningVelocity < 25) {
    profiles.push('slow_progress');
  } else if (analysis.learningVelocity > 60) {
    profiles.push('rapid_learner');
  }

  // Confidence indicator (based on hint patterns)
  if (analysis.aiDependency.hintsBeforeSuccess > 3) {
    profiles.push('low_confidence');
  }

  return profiles;
};

/**
 * Select the best personality for the student profile
 */
const selectPersonality = (profiles, analysis) => {
  // Priority matching
  if (profiles.includes('beginner') || profiles.includes('low_confidence')) {
    return PERSONALITY_ARCHETYPES.ENCOURAGING_MENTOR;
  }

  if (profiles.includes('advanced') && profiles.includes('high_independence')) {
    return PERSONALITY_ARCHETYPES.CHALLENGING_COACH;
  }

  if (profiles.includes('struggling') || profiles.includes('high_dependency')) {
    return PERSONALITY_ARCHETYPES.PATIENT_TEACHER;
  }

  if (profiles.includes('intermediate') && profiles.includes('high_independence')) {
    return PERSONALITY_ARCHETYPES.PEER_COLLABORATOR;
  }

  // Default to Socratic Guide for developing/intermediate students
  return PERSONALITY_ARCHETYPES.SOCRATIC_GUIDE;
};

/**
 * Generate adaptations for the AI based on student profile
 */
const generateAdaptations = (profiles, analysis) => {
  const adaptations = {
    verbosity: 'normal',
    exampleFrequency: 'moderate',
    encouragementLevel: 'moderate',
    challengeLevel: 'appropriate',
    hintProgression: 'standard',
    codeSnippets: true,
    analogies: false
  };

  // Adjust for beginners
  if (profiles.includes('beginner')) {
    adaptations.verbosity = 'detailed';
    adaptations.exampleFrequency = 'frequent';
    adaptations.encouragementLevel = 'high';
    adaptations.analogies = true;
    adaptations.hintProgression = 'gradual';
  }

  // Adjust for advanced students
  if (profiles.includes('advanced') || profiles.includes('excelling')) {
    adaptations.verbosity = 'concise';
    adaptations.exampleFrequency = 'minimal';
    adaptations.challengeLevel = 'high';
    adaptations.hintProgression = 'minimal';
  }

  // Adjust for struggling students
  if (profiles.includes('struggling') || profiles.includes('slow_progress')) {
    adaptations.verbosity = 'detailed';
    adaptations.exampleFrequency = 'frequent';
    adaptations.encouragementLevel = 'high';
    adaptations.hintProgression = 'gradual';
  }

  // Adjust for high AI dependency
  if (profiles.includes('high_dependency')) {
    adaptations.hintProgression = 'restricted'; // Give less direct help
    adaptations.encouragementLevel = 'high'; // But keep encouraging
  }

  return adaptations;
};

/**
 * Generate a personalized system prompt for the AI based on student profile
 */
export const generatePersonalizedPrompt = async (studentId, basePrompt, context = {}) => {
  const { personality, profile, adaptations } = await getShadowTwinPersonality(studentId);

  // Build the personalized prompt
  let personalizedPrompt = basePrompt;

  // Add personality context
  personalizedPrompt += `\n\n## Your Teaching Personality
You are the "${personality.name}" - ${personality.tone}.
${personality.style}
Your approach to hints: ${personality.hintApproach}`;

  // Add adaptations
  personalizedPrompt += `\n\n## Student-Specific Adaptations`;

  if (adaptations.verbosity === 'detailed') {
    personalizedPrompt += `\n- Provide thorough explanations with step-by-step breakdowns`;
  } else if (adaptations.verbosity === 'concise') {
    personalizedPrompt += `\n- Keep explanations concise and to the point`;
  }

  if (adaptations.exampleFrequency === 'frequent') {
    personalizedPrompt += `\n- Include examples to illustrate concepts`;
  } else if (adaptations.exampleFrequency === 'minimal') {
    personalizedPrompt += `\n- Minimize examples unless specifically asked`;
  }

  if (adaptations.encouragementLevel === 'high') {
    personalizedPrompt += `\n- Use encouraging language and acknowledge effort`;
  }

  if (adaptations.analogies) {
    personalizedPrompt += `\n- Use real-world analogies to explain abstract concepts`;
  }

  if (adaptations.hintProgression === 'restricted') {
    personalizedPrompt += `\n- Be more guiding than directive; ask questions before giving answers`;
    personalizedPrompt += `\n- Encourage the student to try on their own first`;
  } else if (adaptations.hintProgression === 'gradual') {
    personalizedPrompt += `\n- Break down hints into smaller, digestible pieces`;
  }

  // Add context about student's current state
  if (context.topic) {
    const competency = await StudentCompetency.findOne({
      studentId,
      topic: context.topic
    });

    if (competency) {
      const proficiencyPercent = Math.round(competency.proficiencyLevel * 100);
      personalizedPrompt += `\n\n## Student's Current Level
Topic: ${context.topic}
Proficiency: ${proficiencyPercent}%
Previous attempts on this topic: ${competency.totalAttempts}`;

      if (proficiencyPercent < 30) {
        personalizedPrompt += `\nNote: Student is still learning fundamentals of this topic.`;
      } else if (proficiencyPercent > 70) {
        personalizedPrompt += `\nNote: Student has good understanding, may need advanced insights.`;
      }
    }
  }

  return {
    prompt: personalizedPrompt,
    personality: personality.name,
    adaptations
  };
};

/**
 * Determine if the student should be encouraged to try independently
 */
export const shouldEncourageIndependence = async (studentId, activityId) => {
  const twin = await StudentTwin.getOrCreate(studentId);
  const dependencyAnalysis = await analyzeAIDependency(studentId);

  // Check recent hint usage for this activity
  const recentHints = await HintRequest.find({ studentId, activityId })
    .sort({ createdAt: -1 })
    .limit(5);

  const timeSinceLastHint = recentHints.length > 0
    ? Date.now() - new Date(recentHints[0].createdAt).getTime()
    : Infinity;

  const shouldEncourage =
    dependencyAnalysis.dependencyScore > 50 ||
    (recentHints.length > 0 && timeSinceLastHint < 5 * 60 * 1000); // Less than 5 minutes

  if (shouldEncourage) {
    return {
      encourage: true,
      message: generateEncouragementMessage(twin, dependencyAnalysis),
      suggestedAction: 'try_first'
    };
  }

  return {
    encourage: false,
    message: null,
    suggestedAction: 'proceed'
  };
};

/**
 * Generate personalized encouragement message
 */
const generateEncouragementMessage = (twin, dependencyAnalysis) => {
  const messages = [
    "Before I give you a hint, take a moment to think about what you've learned so far. What approaches could you try?",
    "I believe you can figure this out! Review your code carefully - what patterns do you notice?",
    "You're building strong skills. Try breaking down the problem into smaller steps first.",
    "Remember, struggling with a problem is how we grow. Give it another shot before asking for help!",
    "You've solved similar problems before. What strategies worked in the past?"
  ];

  // Select based on profile
  if (dependencyAnalysis.dependencyScore > 70) {
    return "I know this is challenging, but trying on your own first will help you learn better. Take a few minutes to experiment with your code, then come back if you're still stuck.";
  }

  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Adjust hint level based on student profile
 */
export const adjustHintLevel = async (studentId, requestedLevel, activityId) => {
  const twin = await StudentTwin.getOrCreate(studentId);
  const analysis = await twin.getFullAnalysis();

  // High independence students - allow full access
  if (analysis.aiDependency.independence === 'high') {
    return {
      adjustedLevel: requestedLevel,
      reason: null
    };
  }

  // High dependency students - may restrict higher levels
  if (analysis.aiDependency.independence === 'low' && requestedLevel >= 4) {
    // Check if they've really tried
    const hintsForActivity = await HintRequest.find({ studentId, activityId });
    const timeSpentOnLowerLevels = hintsForActivity
      .filter(h => h.hintLevel < 4)
      .length;

    if (timeSpentOnLowerLevels < 2) {
      return {
        adjustedLevel: Math.min(requestedLevel, 3),
        reason: "Try working through the lower-level hints first. They'll help build your understanding."
      };
    }
  }

  // Beginners - encourage gradual progression
  if (analysis.learningPhase === 'beginner' && requestedLevel >= 4) {
    return {
      adjustedLevel: requestedLevel,
      reason: "This is a detailed hint. Make sure to understand each step before implementing!"
    };
  }

  return {
    adjustedLevel: requestedLevel,
    reason: null
  };
};

/**
 * Get feedback message after hint usage
 */
export const getPostHintFeedback = async (studentId, hintLevel, wasHelpful) => {
  const twin = await StudentTwin.getOrCreate(studentId);
  const analysis = await twin.getFullAnalysis();

  const feedback = {
    message: '',
    nextSteps: [],
    encouragement: ''
  };

  if (wasHelpful) {
    feedback.encouragement = "Great that the hint helped!";

    if (hintLevel <= 2) {
      feedback.nextSteps = [
        "Try implementing what you learned",
        "If stuck again, try a slightly more detailed hint"
      ];
    } else if (hintLevel === 5) {
      feedback.message = "You received a full solution. To really learn, try to:";
      feedback.nextSteps = [
        "Understand WHY each part works",
        "Try to recreate it without looking",
        "Explain the solution in your own words"
      ];
    }
  } else {
    if (hintLevel < 5) {
      feedback.message = "The hint wasn't quite enough.";
      feedback.nextSteps = [
        "You can request a more detailed hint",
        "Try re-reading the hint and your code together",
        "Look for related concepts in your notes"
      ];
    } else {
      feedback.message = "Even the detailed hint wasn't enough.";
      feedback.nextSteps = [
        "This topic might need more foundational review",
        "Consider reviewing prerequisite concepts",
        "Don't give up - learning takes time!"
      ];
    }
  }

  // Add personalized encouragement based on profile
  if (analysis.learningPhase === 'beginner') {
    feedback.encouragement += " Remember, every expert was once a beginner. Keep practicing!";
  } else if (analysis.aiDependency.trend === 'decreasing') {
    feedback.encouragement += " You're becoming more independent - that's real progress!";
  }

  return feedback;
};

export default {
  getShadowTwinPersonality,
  generatePersonalizedPrompt,
  shouldEncourageIndependence,
  adjustHintLevel,
  getPostHintFeedback,
  PERSONALITY_ARCHETYPES
};
