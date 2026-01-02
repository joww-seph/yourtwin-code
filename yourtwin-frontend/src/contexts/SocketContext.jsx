import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Determine socket URL based on current host (for local network access)
const getSocketUrl = () => {
  // Priority: VITE_SOCKET_URL > VITE_API_URL > auto-detect
  if (import.meta.env.VITE_SOCKET_URL) {
    console.log(`🔌 Socket URL (env): ${import.meta.env.VITE_SOCKET_URL}`);
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace('/api', '');
    console.log(`🔌 Socket URL (from API): ${url}`);
    return url;
  }

  const host = window.location.hostname;

  // Tunnel mode - must use VITE_API_URL env variable
  if (host.includes('.trycloudflare.com') || host.includes('.loca.lt') || host.includes('.ngrok')) {
    console.error('🔌 Tunnel detected but VITE_API_URL not set! Check .env file.');
    return null;
  }

  // Local development
  const socketUrl = `http://${host}:5000`;
  console.log(`🔌 Socket URL (local): ${socketUrl}`);
  return socketUrl;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState({ studentsOnline: 0, instructorsOnline: 0, students: [] });
  const [recentActivity, setRecentActivity] = useState([]);
  const [monitoringUpdates, setMonitoringUpdates] = useState({}); // Map of studentId -> latest data
  const [flagAlerts, setFlagAlerts] = useState([]); // Recent flag alerts
  const [sessionStatusChanges, setSessionStatusChanges] = useState([]); // Recent session status changes
  const { user, isAuthenticated } = useAuth();

  // Max number of recent activities to keep
  const MAX_RECENT_ACTIVITIES = 20;
  const MAX_FLAG_ALERTS = 50;

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);

      // Join role-based room with user info
      newSocket.emit('join-room', {
        userId: user._id || user.id,
        role: user.role,
        userName: user.displayName || user.fullName || `${user.firstName} ${user.lastName}`
      });
    });

    // Listen for online count updates (for instructors)
    newSocket.on('online-count-update', (data) => {
      console.log('📊 Online count update:', data);
      setOnlineCount(data);
    });

    // Listen for real-time submission events (for instructors)
    newSocket.on('submission-created', (data) => {
      console.log('📝 New submission:', data);
      setRecentActivity(prev => {
        const newActivity = {
          id: data.submissionId || Date.now(),
          type: 'submission',
          studentName: data.studentName,
          activityTitle: data.activityTitle,
          score: data.score,
          status: data.status,
          passedTests: data.passedTests,
          totalTests: data.totalTests,
          timestamp: data.timestamp || new Date()
        };
        return [newActivity, ...prev].slice(0, MAX_RECENT_ACTIVITIES);
      });
    });

    // Listen for hint request events
    newSocket.on('hint-requested', (data) => {
      console.log('💡 Hint requested:', data);
      setRecentActivity(prev => {
        const newActivity = {
          id: Date.now(),
          type: 'hint',
          studentName: data.studentName,
          activityTitle: data.activityTitle,
          hintLevel: data.hintLevel,
          timestamp: data.timestamp || new Date()
        };
        return [newActivity, ...prev].slice(0, MAX_RECENT_ACTIVITIES);
      });
    });

    // Listen for student join events
    newSocket.on('student-joined-session', (data) => {
      console.log('👋 Student joined:', data);
      setRecentActivity(prev => {
        const newActivity = {
          id: Date.now(),
          type: 'join',
          studentName: data.studentName,
          sessionTitle: data.sessionTitle,
          timestamp: data.timestamp || new Date()
        };
        return [newActivity, ...prev].slice(0, MAX_RECENT_ACTIVITIES);
      });
    });

    // Listen for monitoring updates (real-time student activity)
    newSocket.on('student-activity', (data) => {
      console.log('👁️ Student activity:', data);
      setMonitoringUpdates(prev => ({
        ...prev,
        [data.studentId]: {
          ...data,
          lastUpdate: new Date()
        }
      }));
    });

    // Listen for monitoring flag alerts
    newSocket.on('monitoring-flag', (data) => {
      console.log('🚨 Monitoring flag:', data);
      setFlagAlerts(prev => {
        const newAlert = {
          id: Date.now(),
          ...data,
          timestamp: data.timestamp || new Date()
        };
        return [newAlert, ...prev].slice(0, MAX_FLAG_ALERTS);
      });
      // Also add to recent activity
      setRecentActivity(prev => {
        const newActivity = {
          id: Date.now(),
          type: 'flag',
          studentName: data.studentName,
          flagType: data.flagType,
          severity: data.severity,
          description: data.description,
          timestamp: data.timestamp || new Date()
        };
        return [newActivity, ...prev].slice(0, MAX_RECENT_ACTIVITIES);
      });
    });

    // Listen for lab session status changes (activate/deactivate)
    newSocket.on('lab-session-status-change', (data) => {
      console.log('📅 Lab session status change:', data);
      setSessionStatusChanges(prev => {
        const newChange = {
          id: Date.now(),
          ...data,
          receivedAt: new Date()
        };
        // Keep only the last 10 changes
        return [newChange, ...prev].slice(0, 10);
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const joinLabSession = (sessionId, sessionTitle = null) => {
    if (socket && isConnected) {
      socket.emit('join-lab-session', { sessionId, sessionTitle });
      console.log(`Joined lab-session-${sessionId}${sessionTitle ? ` (${sessionTitle})` : ''}`);
    }
  };

  const leaveLabSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('leave-lab-session', sessionId);
      console.log(`Left lab-session-${sessionId}`);
    }
  };

  // Clear recent activity
  const clearRecentActivity = () => {
    setRecentActivity([]);
  };

  // Clear flag alerts
  const clearFlagAlerts = () => {
    setFlagAlerts([]);
  };

  // Clear monitoring updates for a specific session (when leaving)
  const clearMonitoringUpdates = () => {
    setMonitoringUpdates({});
  };

  // Clear session status changes
  const clearSessionStatusChanges = () => {
    setSessionStatusChanges([]);
  };

  const value = {
    socket,
    isConnected,
    joinLabSession,
    leaveLabSession,
    onlineCount,
    recentActivity,
    clearRecentActivity,
    monitoringUpdates,
    flagAlerts,
    clearFlagAlerts,
    clearMonitoringUpdates,
    sessionStatusChanges,
    clearSessionStatusChanges
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export default SocketContext;
