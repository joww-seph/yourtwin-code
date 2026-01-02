/**
 * SHADOW TWIN CONTEXT
 *
 * This context manages the SHADOW TWIN - the cognitive opposite of the student.
 *
 * DIGITAL TWIN ARCHITECTURE:
 * - MIRROR TWIN (StudentTwin model): Exact replica of student's learning data,
 *   behavioral patterns, and cognitive profile. Used to determine learning paths.
 *
 * - SHADOW TWIN (this context + shadowTwinEngine): The cognitive opposite of the
 *   student. Where the student has weaknesses, the Shadow Twin has strengths.
 *   Provides personalized hints through the 5-level system.
 *
 * THE 5-LEVEL HINT SYSTEM:
 * Level 1: General guidance and problem understanding
 * Level 2: Code structure and approach suggestions
 * Level 3: Algorithmic hints and logic assistance
 * Level 4: Partial code examples and detailed guidance
 * Level 5: Complete solution with mandatory comprehension check
 *
 * The Shadow Twin adapts its hints based on the Mirror Twin's profile,
 * filling in the gaps in the student's knowledge while encouraging
 * independent problem-solving.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { aiAPI } from '../services/api';

const ShadowTwinContext = createContext(null);

export const ShadowTwinProvider = ({ children, activityId, aiAssistanceLevel = 5 }) => {
  // State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentHint, setCurrentHint] = useState(null);
  const [hintHistory, setHintHistory] = useState([]);
  const [recommendedLevel, setRecommendedLevel] = useState(1);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [maxHints] = useState(10);
  const [error, setError] = useState(null);
  const [comprehensionPending, setComprehensionPending] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  // Check if AI is locked
  const isLockdown = aiAssistanceLevel === 0;

  // Fetch hint history
  const fetchHintHistory = useCallback(async () => {
    if (!activityId || isLockdown) return;

    try {
      const response = await aiAPI.getHintHistory(activityId);
      if (response.data.success) {
        setHintHistory(response.data.data.hints || []);
        setHintsUsed(response.data.data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch hint history:', err);
    }
  }, [activityId, isLockdown]);

  // Fetch recommended level
  const fetchRecommendedLevel = useCallback(async (attempts = 0) => {
    if (!activityId || isLockdown) return;

    try {
      const response = await aiAPI.getRecommendedLevel(activityId, {
        timeSpent,
        attempts
      });
      if (response.data.success) {
        setRecommendedLevel(response.data.data.recommendedLevel);
        setHintsUsed(response.data.data.hintsUsed);
      }
    } catch (err) {
      console.error('Failed to fetch recommended level:', err);
    }
  }, [activityId, timeSpent, isLockdown]);

  // Request a hint
  const requestHint = useCallback(async ({
    code,
    errorOutput,
    hintLevel,
    description,
    whatTried
  }) => {
    if (isLockdown) {
      setError('AI assistance is not available for this activity');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiAPI.requestHint({
        activityId,
        code,
        errorOutput,
        hintLevel: hintLevel || recommendedLevel,
        description,
        whatTried,
        timeSpent
      });

      const data = response.data;

      if (data.success) {
        if (data.granted) {
          setCurrentHint({
            id: data.data.hintId,
            content: data.data.hint,
            level: data.data.level,
            provider: data.data.provider,
            comprehensionRequired: data.data.comprehensionRequired,
            comprehensionQuestion: data.data.comprehensionQuestion
          });
          setHintsUsed(prev => prev + 1);
          setComprehensionPending(data.data.comprehensionRequired);

          // Refresh history
          await fetchHintHistory();

          return { success: true, hint: data.data };
        } else {
          setError(data.message);
          return { success: false, reason: data.reason, message: data.message };
        }
      }

      return { success: false };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to get hint';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [activityId, recommendedLevel, timeSpent, isLockdown, fetchHintHistory]);

  // Submit comprehension answer
  const submitComprehension = useCallback(async (answer) => {
    if (!currentHint?.id) return { success: false };

    setIsLoading(true);

    try {
      const response = await aiAPI.submitComprehension({
        hintId: currentHint.id,
        answer
      });

      const data = response.data;

      if (data.success) {
        setComprehensionPending(false);
        return {
          success: true,
          passed: data.data.passed,
          feedback: data.data.feedback,
          simplerExplanation: data.data.simplerExplanation
        };
      }

      return { success: false };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to check comprehension';
      setError(message);
      return { success: false, message };
    } finally {
      setIsLoading(false);
    }
  }, [currentHint]);

  // Submit feedback
  const submitFeedback = useCallback(async (hintId, wasHelpful) => {
    try {
      await aiAPI.submitFeedback(hintId, wasHelpful);
      return { success: true };
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      return { success: false };
    }
  }, []);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
    if (!isPanelOpen) {
      setError(null);
    }
  }, [isPanelOpen]);

  // Update time spent
  const updateTimeSpent = useCallback((seconds) => {
    setTimeSpent(seconds);
  }, []);

  // Clear current hint
  const clearCurrentHint = useCallback(() => {
    setCurrentHint(null);
    setComprehensionPending(false);
  }, []);

  // Clear error (for when asking new questions)
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    isPanelOpen,
    isLoading,
    currentHint,
    hintHistory,
    recommendedLevel,
    hintsUsed,
    maxHints,
    error,
    comprehensionPending,
    isLockdown,
    aiAssistanceLevel,
    timeSpent,

    // Actions
    togglePanel,
    requestHint,
    submitComprehension,
    submitFeedback,
    fetchHintHistory,
    fetchRecommendedLevel,
    updateTimeSpent,
    clearCurrentHint,
    clearError
  };

  return (
    <ShadowTwinContext.Provider value={value}>
      {children}
    </ShadowTwinContext.Provider>
  );
};

// Custom hook
export const useShadowTwin = () => {
  const context = useContext(ShadowTwinContext);
  if (!context) {
    throw new Error('useShadowTwin must be used within ShadowTwinProvider');
  }
  return context;
};

export default ShadowTwinContext;
