import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook for tracking behavioral patterns during coding sessions.
 * Captures typing speed, pauses, paste events, and code changes.
 */
function useBehavioralTracking() {
  // Metrics state
  const [metrics, setMetrics] = useState({
    totalKeystrokes: 0,
    typingSpeed: 0, // characters per minute
    averagePauseDuration: 0, // seconds between keystrokes
    pasteEvents: 0,
    pasteCharacters: 0,
    codeChanges: 0,
    longestPause: 0,
    idleTime: 0 // total seconds of inactivity
  });

  // Refs for tracking
  const lastKeystrokeTimeRef = useRef(null);
  const keystrokesRef = useRef(0);
  const pauseDurationsRef = useRef([]);
  const sessionStartRef = useRef(Date.now());
  const lastActivityRef = useRef(Date.now());
  const idleCheckIntervalRef = useRef(null);

  // For calculating typing speed over rolling window
  const recentKeystrokesRef = useRef([]); // { timestamp, count }

  // Constants
  const PAUSE_THRESHOLD = 3000; // 3 seconds = considered a pause
  const IDLE_THRESHOLD = 30000; // 30 seconds = considered idle
  const TYPING_SPEED_WINDOW = 60000; // Calculate speed over last 60 seconds

  // Track idle time
  useEffect(() => {
    idleCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= IDLE_THRESHOLD) {
        setMetrics(prev => ({
          ...prev,
          idleTime: prev.idleTime + 1 // Add 1 second of idle time
        }));
      }
    }, 1000);

    return () => {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, []);

  // Calculate typing speed from recent keystrokes
  const calculateTypingSpeed = useCallback(() => {
    const now = Date.now();
    const windowStart = now - TYPING_SPEED_WINDOW;

    // Filter keystrokes within the window
    const recentStrokes = recentKeystrokesRef.current.filter(
      k => k.timestamp >= windowStart
    );
    recentKeystrokesRef.current = recentStrokes;

    if (recentStrokes.length === 0) return 0;

    const totalChars = recentStrokes.reduce((sum, k) => sum + k.count, 0);
    const timeSpanMs = now - recentStrokes[0].timestamp;

    if (timeSpanMs === 0) return 0;

    // Characters per minute
    return Math.round((totalChars / timeSpanMs) * 60000);
  }, []);

  // Handle keystroke event
  const handleKeystroke = useCallback((charCount = 1) => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Calculate pause since last keystroke
    if (lastKeystrokeTimeRef.current) {
      const pauseMs = now - lastKeystrokeTimeRef.current;

      if (pauseMs >= PAUSE_THRESHOLD && pauseMs < IDLE_THRESHOLD) {
        pauseDurationsRef.current.push(pauseMs / 1000);
      }
    }

    lastKeystrokeTimeRef.current = now;
    keystrokesRef.current += charCount;

    // Add to recent keystrokes for speed calculation
    recentKeystrokesRef.current.push({
      timestamp: now,
      count: charCount
    });

    // Update metrics
    const typingSpeed = calculateTypingSpeed();
    const pauses = pauseDurationsRef.current;
    const avgPause = pauses.length > 0
      ? pauses.reduce((a, b) => a + b, 0) / pauses.length
      : 0;
    const longestPause = pauses.length > 0
      ? Math.max(...pauses)
      : 0;

    setMetrics(prev => ({
      ...prev,
      totalKeystrokes: keystrokesRef.current,
      typingSpeed,
      averagePauseDuration: Math.round(avgPause * 10) / 10,
      longestPause: Math.round(longestPause * 10) / 10
    }));
  }, [calculateTypingSpeed]);

  // Handle paste event
  const handlePaste = useCallback((pastedText) => {
    lastActivityRef.current = Date.now();
    const charCount = pastedText?.length || 0;

    setMetrics(prev => ({
      ...prev,
      pasteEvents: prev.pasteEvents + 1,
      pasteCharacters: prev.pasteCharacters + charCount
    }));
  }, []);

  // Handle code change (for tracking number of edits)
  const handleCodeChange = useCallback(() => {
    lastActivityRef.current = Date.now();

    setMetrics(prev => ({
      ...prev,
      codeChanges: prev.codeChanges + 1
    }));
  }, []);

  // Get session duration in seconds
  const getSessionDuration = useCallback(() => {
    return Math.floor((Date.now() - sessionStartRef.current) / 1000);
  }, []);

  // Get complete behavioral data for submission
  const getBehavioralData = useCallback(() => {
    const sessionDuration = getSessionDuration();
    const activeTime = sessionDuration - metrics.idleTime;

    return {
      ...metrics,
      sessionDuration,
      activeTime,
      activeTimePercentage: sessionDuration > 0
        ? Math.round((activeTime / sessionDuration) * 100)
        : 100
    };
  }, [metrics, getSessionDuration]);

  // Reset metrics (for new session)
  const resetMetrics = useCallback(() => {
    keystrokesRef.current = 0;
    pauseDurationsRef.current = [];
    recentKeystrokesRef.current = [];
    lastKeystrokeTimeRef.current = null;
    sessionStartRef.current = Date.now();
    lastActivityRef.current = Date.now();

    setMetrics({
      totalKeystrokes: 0,
      typingSpeed: 0,
      averagePauseDuration: 0,
      pasteEvents: 0,
      pasteCharacters: 0,
      codeChanges: 0,
      longestPause: 0,
      idleTime: 0
    });
  }, []);

  return {
    metrics,
    handleKeystroke,
    handlePaste,
    handleCodeChange,
    getBehavioralData,
    getSessionDuration,
    resetMetrics
  };
}

export default useBehavioralTracking;
