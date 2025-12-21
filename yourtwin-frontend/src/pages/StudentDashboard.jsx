import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI, submissionAPI } from '../services/api';
import { Code, CheckCircle, Clock, TrendingUp, LogOut, User } from 'lucide-react';
import { BarChart3, Calendar, Users } from 'lucide-react';
import { showError } from '../utils/sweetalert';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch lab sessions enrolled in
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const [sessionsRes, submissionsRes] = await Promise.all([
          labSessionAPI.getAll(),
          submissionAPI.getAll()
        ]);
        const sessions = sessionsRes.data.data || [];
        console.log('📥 Initial fetch - Received sessions from backend:', sessions.length);
        sessions.forEach(s => console.log(`  - ${s.title} (ID: ${s._id}, Active: ${s.isActive})`));
        // Ensure only active sessions are shown to students
        const activeOnly = sessions.filter(s => s.isActive);
        setSessions(activeOnly);
        setSubmissions(submissionsRes.data.data || []);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      const handleSessionUpdate = async () => {
        // Check if we still have a valid token before making API calls
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No token available, skipping session refresh');
          return;
        }

        console.log('Lab session updated - refreshing dashboard');
        try {
          const res = await labSessionAPI.getAll();
          const fetchedSessions = res.data.data || [];
          console.log('📥 Updated sessions from backend:', fetchedSessions.length);
          fetchedSessions.forEach(s => console.log(`  - ${s.title} (ID: ${s._id}, Active: ${s.isActive})`));
          // Ensure only active sessions are stored client-side
          const activeSessions = fetchedSessions.filter(s => s.isActive);
          console.log(`📊 Active sessions for student: ${activeSessions.length}`);
          setSessions(activeSessions);
        } catch (err) {
          // Only log the error, don't crash - the API interceptor handles redirects if needed
          console.error('Failed to refresh sessions:', err.response?.data?.message || err.message);
        }
      };

      socket.on('lab-session-created', (data) => {
        console.log('🆕 Received lab-session-created event', data);
        handleSessionUpdate();
      });
      socket.on('lab-session-activated', (data) => {
        console.log('✅ Received lab-session-activated event', data);
        handleSessionUpdate();
      });
      socket.on('lab-session-deactivated', (data) => {
        console.log('❌ Received lab-session-deactivated event', data);
        handleSessionUpdate();
      });
      socket.on('lab-session-updated', (data) => {
        console.log('🔄 Received lab-session-updated event', data);
        handleSessionUpdate();
      });
      socket.on('lab-session-deleted', (data) => {
        console.log('🗑️ Received lab-session-deleted event', data);
        handleSessionUpdate();
      });

      return () => {
        socket.off('lab-session-created');
        socket.off('lab-session-activated');
        socket.off('lab-session-deactivated');
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
      };
    }
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  // Calculate stats from real data
  const totalActivities = sessions.reduce((sum, session) => sum + (session.activities?.length || 0), 0);

  // Get all unique activity IDs from all sessions
  const allActivityIds = sessions.flatMap(session =>
    (session.activities || []).map(a => a._id || a)
  );

  // Count completed activities (where status === 'passed')
  // Use activityId (BCNF field name) - backend returns activityId, not activity
  const completedActivities = allActivityIds.filter(activityId => {
    return (submissions || []).some(sub => {
      if (!sub || !activityId) return false;
      const subActivityId = typeof sub.activityId === 'object' ? sub.activityId?._id : sub.activityId;
      return subActivityId === activityId && sub.status === 'passed';
    });
  }).length;

  const activeSessions = sessions.filter(s => s.isActive).length;

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Header */}
      <header className="bg-[#313244] shadow-lg border-b border-[#45475a]">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <img src="/header.png" alt="YOURTWIN: CODE" className="h-10 w-auto" />
              <h2 className="text-l font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent">
                Student Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium text-[#cdd6f4]">
                  {user?.displayName || `${user?.firstName} ${user?.lastName}`}
                </p>
                <p className="text-sm text-[#bac2de]">
                  {user?.course} {user?.yearLevel}-{user?.section}
                </p>
              </div>
              <button
                onClick={() => navigate('/student/sandbox')}
                className="p-2 hover:bg-[#45475a] rounded-lg transition"
                title="Code Sandbox"
              >
                <Code className="w-5 h-5 text-[#bac2de]" />
              </button>
              <button
                onClick={() => navigate('/student/profile')}
                className="p-2 hover:bg-[#45475a] rounded-lg transition"
                title="Edit Profile"
              >
                <User className="w-5 h-5 text-[#bac2de]" />
              </button>
              <button
                onClick={() => navigate('/student/progress')}
                className="p-2 hover:bg-[#45475a] rounded-lg transition"
                title="My Progress"
              >
                <BarChart3 className="w-5 h-5 text-[#bac2de]" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-[#45475a] rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-[#bac2de]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] rounded-lg shadow-lg p-6 text-[#1e1e2e] mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.firstName || user?.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-[#11111b]">Ready to continue your coding journey?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Calendar className="w-8 h-8" />}
            title="Active Sessions"
            value={`${activeSessions}`}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-8 h-8" />}
            title="Total Activities"
            value={`${totalActivities}`}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Completed"
            value={`${completedActivities}`}
            color="purple"
          />
        </div>

        {/* Quick Access */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => navigate('/student/sandbox')}
            className="bg-[#313244] border border-[#45475a] rounded-lg p-4 hover:border-[#89b4fa] transition group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#89b4fa] bg-opacity-20 text-[#89b4fa] group-hover:bg-opacity-30 transition">
                <Code className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-[#cdd6f4]">Code Sandbox</h4>
                <p className="text-sm text-[#bac2de]">Practice coding freely without test cases</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => navigate('/student/progress')}
            className="bg-[#313244] border border-[#45475a] rounded-lg p-4 hover:border-[#a6e3a1] transition group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1] group-hover:bg-opacity-30 transition">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-[#cdd6f4]">My Progress</h4>
                <p className="text-sm text-[#bac2de]">View your performance and statistics</p>
              </div>
            </div>
          </button>
        </div>

        {/* Enrolled Lab Sessions */}
        <div className="bg-[#313244] rounded-lg shadow-lg border border-[#45475a] p-6">
          <h3 className="text-xl font-bold text-[#cdd6f4] mb-4">My Enrolled Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-[#bac2de] text-center py-8">You are not enrolled in any lab sessions yet.</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <LabSessionCard 
                  key={session._id}
                  session={session}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper Components
function StatCard({ icon, title, value, color }) {
  const colorClasses = {
    green: 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]',
    blue: 'bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]',
    purple: 'bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]'
  };

  return (
    <div className="bg-[#313244] border border-[#45475a] rounded-lg shadow-lg p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4`}>
        {icon}
      </div>
      <p className="text-[#bac2de] text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-[#cdd6f4]">{value}</p>
    </div>
  );
}

function ActivityCard({ activity }) {
  const navigate = useNavigate();
  const [submissionStatus, setSubmissionStatus] = useState(null);

  useEffect(() => {
    // Fetch submission status for this activity
    const fetchStatus = async () => {
      try {
        const response = await submissionAPI.getMySubmissions(activity._id);
        if (response.data.stats) {
          setSubmissionStatus(response.data.stats);
        }
      } catch (error) {
        // Silent fail - not critical
        console.debug('No submission stats yet');
      }
    };
    fetchStatus();
  }, [activity._id]);

  const handleStart = () => {
    navigate(`/student/activity/${activity._id}`);
  };

  const typeStyles = {
    practice: 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1] border border-[#a6e3a1] border-opacity-30',
    final: 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8] border border-[#f38ba8] border-opacity-30'
  };

  const difficultyStyles = {
    easy: 'bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]',
    medium: 'bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]',
    hard: 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
  };

  return (
    <div className="border border-[#45475a] bg-[#181825] rounded-lg p-4 hover:shadow-md hover:border-[#89b4fa] transition">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Code className="w-5 h-5 text-[#89b4fa] mt-1" />
          <div className="flex-1">
            <h4 className="font-medium text-[#cdd6f4] mb-1">{activity.title}</h4>
            <p className="text-sm text-[#bac2de] mb-2 line-clamp-2">
              {activity.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${typeStyles[activity.type]}`}>
                {activity.type}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyStyles[activity.difficulty]}`}>
                {activity.difficulty}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-[#6c7086] bg-opacity-20 text-[#bac2de]">
                {activity.language.toUpperCase()}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]">
                {activity.topic}
              </span>
            </div>
            
            {/* Submission Status */}
            {submissionStatus && (
              <div className="flex items-center gap-3 text-xs text-[#6c7086]">
                <span>Best: {submissionStatus.bestScore}%</span>
                <span>•</span>
                <span>Attempts: {submissionStatus.totalAttempts}</span>
                {submissionStatus.passed && (
                  <>
                    <span>•</span>
                    <span className="text-[#a6e3a1]">✓ Completed</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={handleStart}
          className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition text-sm font-medium"
        >
          {submissionStatus?.passed ? 'Review' : 'Start'}
        </button>
      </div>
    </div>
  );
}

// Lab Session Card Component
function LabSessionCard({ session }) {
  const navigate = useNavigate();

  return (
    <div className="border border-[#45475a] bg-[#181825] rounded-lg p-4 hover:shadow-md hover:border-[#89b4fa] transition cursor-pointer"
      onClick={() => {
        if (!session.isActive) {
          showError('Session is not active', 'You cannot access this session');
          return;
        }
        navigate(`/student/session/${session._id}`);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-[#cdd6f4] mb-1">{session.title}</h4>
          <p className="text-sm text-[#bac2de] line-clamp-2">{session.description}</p>
        </div>
        {session.isActive && (
          <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]">
            Active
          </span>
        )}
      </div>

      {/* Target audience badge */}
      <div className="mb-3">
        <span className="px-2 py-1 rounded text-xs font-medium bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]">
          {session.course} {session.yearLevel}-{session.section}
        </span>
        {session.room && (
          <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]">
            Room: {session.room}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-[#bac2de]">
        {session.instructor && (
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            Prof. {typeof session.instructor === 'object'
              ? `${session.instructor.firstName} ${session.instructor.lastName}`
              : session.instructor}
          </div>
        )}
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {new Date(session.scheduledDate).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {session.startTime} - {session.endTime}
        </div>
        <div className="flex items-center gap-1">
          <Code className="w-4 h-4" />
          {(session?.activities?.length || 0)} activities
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;