import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const IDLE_THRESHOLD = 60000; // 1 minute of inactivity = idle
const EVENT_BATCH_INTERVAL = 3000; // Send events every 3 seconds for faster updates
const LARGE_PASTE_THRESHOLD = 50; // Characters

export function useActivityMonitoring(activityId, labSessionId = null, isEnabled = true) {
  const [monitoringId, setMonitoringId] = useState(null);
  const [stats, setStats] = useState({
    tabSwitchCount: 0,
    pasteCount: 0,
    timeAwayPercentage: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for tracking
  const eventQueueRef = useRef([]);
  const blurTimeRef = useRef(null);
  const lastActivityTimeRef = useRef(Date.now());
  const isIdleRef = useRef(false);
  const idleStartTimeRef = useRef(null);
  const startTimeRef = useRef(null);
  const batchIntervalRef = useRef(null);
  const monitoringIdRef = useRef(null); // Ref to avoid stale closure issues
  const isMonitoringRef = useRef(false);

  // Start monitoring session
  const startMonitoring = useCallback(async () => {
    if (!activityId || !isEnabled) return;

    try {
      const response = await api.post('/monitoring/start', {
        activityId,
        labSessionId
      });

      if (response.data.success) {
        const newMonitoringId = response.data.monitoringId;
        setMonitoringId(newMonitoringId);
        monitoringIdRef.current = newMonitoringId; // Update ref immediately
        setIsMonitoring(true);
        isMonitoringRef.current = true; // Update ref immediately
        startTimeRef.current = Date.now();
        lastActivityTimeRef.current = Date.now();
        console.log('Monitoring started:', newMonitoringId);
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  }, [activityId, labSessionId, isEnabled]);

  // Queue an event for batch sending
  const queueEvent = useCallback((event) => {
    // Use ref to check monitoring status (avoids stale closure)
    if (!isMonitoringRef.current) {
      console.log('Event skipped - monitoring not active:', event.type);
      return;
    }

    eventQueueRef.current.push({
      ...event,
      timestamp: new Date().toISOString()
    });

    console.log('Event queued:', event.type, 'Queue size:', eventQueueRef.current.length);

    // Update local stats immediately for UI feedback
    if (event.type === 'blur') {
      setStats(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }));
    } else if (event.type === 'paste') {
      setStats(prev => ({ ...prev, pasteCount: prev.pasteCount + 1 }));
    }
  }, []);

  // Send queued events to backend
  const flushEvents = useCallback(async () => {
    // Use ref to get current monitoringId (avoids stale closure)
    const currentMonitoringId = monitoringIdRef.current;
    if (!currentMonitoringId || eventQueueRef.current.length === 0) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    console.log('Flushing', events.length, 'events to server');

    try {
      await api.post('/monitoring/events', {
        monitoringId: currentMonitoringId,
        events
      });
      console.log('Events sent successfully');
    } catch (error) {
      console.error('Failed to send monitoring events:', error);
      // Re-queue events on failure
      eventQueueRef.current = [...events, ...eventQueueRef.current];
    }
  }, []);

  // End monitoring session
  const endMonitoring = useCallback(async () => {
    if (!monitoringId) return;

    // Flush remaining events
    await flushEvents();

    const totalActiveTime = Date.now() - (startTimeRef.current || Date.now());

    try {
      const response = await api.post('/monitoring/end', {
        monitoringId,
        totalActiveTime
      });

      if (response.data.success) {
        setStats({
          tabSwitchCount: response.data.summary.tabSwitchCount,
          pasteCount: response.data.summary.pasteCount,
          timeAwayPercentage: response.data.summary.timeAwayPercentage
        });
      }
    } catch (error) {
      console.error('Failed to end monitoring:', error);
    }

    setIsMonitoring(false);
    setMonitoringId(null);
  }, [monitoringId, flushEvents]);

  // Handle tab visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!isMonitoring) return;

    if (document.hidden) {
      // Tab became hidden (blur)
      blurTimeRef.current = Date.now();
      queueEvent({ type: 'blur' });
    } else {
      // Tab became visible (focus)
      if (blurTimeRef.current) {
        const blurDuration = Date.now() - blurTimeRef.current;
        queueEvent({
          type: 'focus',
          blurDuration
        });
        blurTimeRef.current = null;
      }
    }
  }, [isMonitoring, queueEvent]);

  // Handle window focus/blur (catches more cases)
  const handleWindowBlur = useCallback(() => {
    if (!isMonitoring || document.hidden) return;
    blurTimeRef.current = Date.now();
    queueEvent({ type: 'blur' });
  }, [isMonitoring, queueEvent]);

  const handleWindowFocus = useCallback(() => {
    if (!isMonitoring) return;
    if (blurTimeRef.current) {
      const blurDuration = Date.now() - blurTimeRef.current;
      queueEvent({
        type: 'focus',
        blurDuration
      });
      blurTimeRef.current = null;
    }
  }, [isMonitoring, queueEvent]);

  // Handle paste events
  const handlePaste = useCallback((pasteData, isExternal = false) => {
    // Use ref to check monitoring status
    if (!isMonitoringRef.current) {
      console.log('Paste ignored - monitoring not active');
      return;
    }

    const pasteSize = pasteData?.length || 0;
    console.log('Paste event:', pasteSize, 'chars, external:', isExternal);

    queueEvent({
      type: 'paste',
      pasteSize,
      pasteContent: pasteData?.substring(0, 100), // First 100 chars for review
      isExternal
    });

    // Reset activity timer
    lastActivityTimeRef.current = Date.now();

    // If was idle, end idle period
    if (isIdleRef.current) {
      const idleDuration = Date.now() - idleStartTimeRef.current;
      queueEvent({
        type: 'idle_end',
        idleDuration
      });
      isIdleRef.current = false;
    }

    // Immediately flush paste events (important for monitoring)
    setTimeout(() => flushEvents(), 100);
  }, [queueEvent, flushEvents]);

  // Handle blocked paste events (in lockdown mode)
  const handleBlockedPaste = useCallback((pasteData) => {
    // Use ref to check monitoring status
    if (!isMonitoringRef.current) return;

    const pasteSize = pasteData?.length || 0;
    console.log('Blocked paste event:', pasteSize, 'chars');

    queueEvent({
      type: 'blocked_paste',
      pasteSize,
      pasteContent: pasteData?.substring(0, 100) // First 100 chars for review
    });

    // Update local stats
    setStats(prev => ({ ...prev, blockedPasteCount: (prev.blockedPasteCount || 0) + 1 }));

    // Immediately flush blocked paste events (critical for monitoring)
    setTimeout(() => flushEvents(), 100);
  }, [queueEvent, flushEvents]);

  // Handle code changes (for activity detection) - debounced to reduce overhead
  const handleCodeChange = useCallback((lineCount, charCount) => {
    // Use ref to check monitoring status
    if (!isMonitoringRef.current) return;

    // Reset activity timer
    lastActivityTimeRef.current = Date.now();

    // If was idle, end idle period
    if (isIdleRef.current) {
      const idleDuration = Date.now() - idleStartTimeRef.current;
      queueEvent({
        type: 'idle_end',
        idleDuration
      });
      isIdleRef.current = false;
    }
  }, [queueEvent]);

  // Check for idle state
  useEffect(() => {
    if (!isMonitoring) return;

    const idleCheckInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTimeRef.current;

      if (timeSinceActivity > IDLE_THRESHOLD && !isIdleRef.current) {
        // Start idle period
        isIdleRef.current = true;
        idleStartTimeRef.current = Date.now();
        queueEvent({ type: 'idle_start' });
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(idleCheckInterval);
  }, [isMonitoring, queueEvent]);

  // Set up event listeners
  useEffect(() => {
    if (!isEnabled) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isEnabled, handleVisibilityChange, handleWindowBlur, handleWindowFocus]);

  // Set up batch sending interval
  useEffect(() => {
    if (!isMonitoring) return;

    batchIntervalRef.current = setInterval(flushEvents, EVENT_BATCH_INTERVAL);

    return () => {
      if (batchIntervalRef.current) {
        clearInterval(batchIntervalRef.current);
      }
    };
  }, [isMonitoring, flushEvents]);

  // Auto-start monitoring when activityId is provided
  useEffect(() => {
    if (activityId && isEnabled && !isMonitoring) {
      startMonitoring();
    }

    // Cleanup on unmount
    return () => {
      if (isMonitoring) {
        endMonitoring();
      }
    };
  }, [activityId, isEnabled]);

  return {
    isMonitoring,
    stats,
    startMonitoring,
    endMonitoring,
    handlePaste,
    handleBlockedPaste,
    handleCodeChange,
    monitoringId
  };
}

export default useActivityMonitoring;
