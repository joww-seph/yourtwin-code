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
  const { user, isAuthenticated } = useAuth();

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

  const joinLabSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('join-lab-session', sessionId);
      console.log(`Joined lab-session-${sessionId}`);
    }
  };

  const leaveLabSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('leave-lab-session', sessionId);
      console.log(`Left lab-session-${sessionId}`);
    }
  };

  const value = {
    socket,
    isConnected,
    joinLabSession,
    leaveLabSession,
    onlineCount
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
