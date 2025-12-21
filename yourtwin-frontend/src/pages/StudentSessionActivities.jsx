import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI, submissionAPI } from '../services/api';
import {
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  BookOpen,
  User
} from 'lucide-react';

function StudentSessionActivities() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { socket, joinLabSession, leaveLabSession } = useSocket();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    fetchSessionDetails();
    fetchSubmissions();
  }, [sessionId]);

  // Join lab session room for real-time updates
  useEffect(() => {
    if (sessionId && socket) {
      joinLabSession(sessionId);

      const handleSessionDeleted = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          console.log('📡 [Student] Session deleted - redirecting to dashboard');
          navigate('/student/dashboard');
        }
      };

      // Listen for real-time updates
      socket.on('lab-session-updated', handleSessionUpdate);
      socket.on('lab-session-deleted', handleSessionDeleted);
      socket.on('lab-session-deactivated', handleSessionUpdate);
      socket.on('activity-created', handleActivityCreated);
      socket.on('activity-updated', handleActivityUpdated);
      socket.on('activity-deleted', handleActivityDeleted);

      return () => {
        socket.off('lab-session-updated', handleSessionUpdate);
        socket.off('lab-session-deleted', handleSessionDeleted);
        socket.off('lab-session-deactivated', handleSessionUpdate);
        socket.off('activity-created', handleActivityCreated);
        socket.off('activity-updated', handleActivityUpdated);
        socket.off('activity-deleted', handleActivityDeleted);
        leaveLabSession(sessionId);
      };
    }
  }, [sessionId, socket, navigate]);

  const handleSessionUpdate = (data) => {
    if (data.sessionId === sessionId) {
      console.log('Session updated in real-time:', data);
      // If session is deactivated, redirect to dashboard
      if (data.isActive === false) {
        console.log('Session deactivated - redirecting to dashboard');
        navigate('/student/dashboard');
        return;
      }
      fetchSessionDetails();
    }
  };

  const handleActivityCreated = (data) => {
    if (data.sessionId === sessionId) {
      console.log('Activity created in real-time:', data);
      fetchSessionDetails();
    }
  };

  const handleActivityUpdated = (data) => {
    if (data.sessionId === sessionId) {
      console.log('Activity updated in real-time:', data);
      fetchSessionDetails();
    }
  };

  const handleActivityDeleted = (data) => {
    if (data.sessionId === sessionId) {
      console.log('Activity deleted in real-time:', data);
      fetchSessionDetails();
    }
  };

  const fetchSessionDetails = async () => {
    try {
      const response = await labSessionAPI.getOne(sessionId);
      const sessionData = response.data.data;

      // If session is not active, redirect to dashboard
      if (!sessionData.isActive) {
        console.log('Session is not active - redirecting to dashboard');
        navigate('/student/dashboard');
        return;
      }

      setSession(sessionData);
      // Filter out null/undefined activities
      setActivities((sessionData.activities || []).filter(a => a != null));
    } catch (error) {
      console.error('Failed to fetch session details:', error);
      // If 403 error (session not active or no access), redirect to dashboard
      if (error.response?.status === 403) {
        navigate('/student/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await submissionAPI.getAll();
      setSubmissions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const getActivityStatus = (activityId) => {
    if (!activityId) return 'not-started';
    const activitySubmissions = (submissions || []).filter(s => {
      if (!s || !s.activityId) return false;
      // Handle both populated and non-populated activity references (BCNF: activityId)
      const subActivityId = typeof s.activityId === 'object' ? s.activityId?._id : s.activityId;
      return subActivityId === activityId;
    });
    if (activitySubmissions.length === 0) return 'not-started';

    const hasPass = activitySubmissions.some(s => s.status === 'passed');
    return hasPass ? 'completed' : 'in-progress';
  };

  const getBestScore = (activityId) => {
    if (!activityId) return 0;
    const activitySubmissions = (submissions || []).filter(s => {
      if (!s || !s.activityId) return false;
      const subActivityId = typeof s.activityId === 'object' ? s.activityId?._id : s.activityId;
      return subActivityId === activityId;
    });
    if (activitySubmissions.length === 0) return 0;

    return Math.max(...activitySubmissions.map(s => s.score || 0));
  };

  const getAttemptCount = (activityId) => {
    if (!activityId) return 0;
    return (submissions || []).filter(s => {
      if (!s || !s.activityId) return false;
      const subActivityId = typeof s.activityId === 'object' ? s.activityId?._id : s.activityId;
      return subActivityId === activityId;
    }).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <p className="text-[#f38ba8]">Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Header */}
      <header className="bg-[#313244] border-b border-[#45475a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-2 hover:bg-[#45475a] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-[#bac2de]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent">
                {session.title}
              </h1>
              <p className="text-sm text-[#bac2de] mt-1">{session.description}</p>
              {session.instructor && (
                <p className="text-sm text-[#6c7086] mt-1 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Prof. {typeof session.instructor === 'object'
                    ? `${session.instructor.firstName} ${session.instructor.lastName}`
                    : session.instructor}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-[#313244] border-b border-[#45475a] px-6 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1e1e2e] border border-[#45475a] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#89b4fa] bg-opacity-20 rounded-lg">
                <BookOpen className="w-6 h-6 text-[#89b4fa]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Total Activities</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">{activities.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e2e] border border-[#45475a] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#a6e3a1] bg-opacity-20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-[#a6e3a1]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Completed</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {activities.filter(a => getActivityStatus(a._id) === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e2e] border border-[#45475a] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#f9e2af] bg-opacity-20 rounded-lg">
                <Target className="w-6 h-6 text-[#f9e2af]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Completion Rate</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {activities.length > 0 
                    ? Math.round((activities.filter(a => getActivityStatus(a._id) === 'completed').length / activities.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-[#cdd6f4] mb-6">Activities</h2>

        {activities.length === 0 ? (
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-8 text-center">
            <BookOpen className="w-12 h-12 text-[#6c7086] mx-auto mb-4" />
            <p className="text-[#bac2de]">No activities in this session yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.filter(a => a != null).map((activity, index) => {
              if (!activity || !activity._id) return null;
              const status = getActivityStatus(activity._id);
              const bestScore = getBestScore(activity._id);
              const attemptCount = getAttemptCount(activity._id);

              return (
                <div
                  key={activity._id}
                  className="bg-[#313244] border border-[#45475a] rounded-lg p-5 hover:border-[#585b70] transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-[#6c7086] bg-[#45475a] px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-bold text-[#cdd6f4]">
                          {activity.title}
                        </h3>
                      </div>
                      <p className="text-sm text-[#bac2de] mb-3">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-[#bac2de] mb-3">
                        {activity.language && (
                          <span className="px-2 py-1 bg-[#94e2d5] bg-opacity-20 text-[#94e2d5] rounded font-medium uppercase">
                            {activity.language}
                          </span>
                        )}
                        {activity.topic && (
                          <span className="px-2 py-1 bg-[#45475a] rounded">
                            {activity.topic}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded font-medium ${
                          activity.difficulty === 'easy'
                            ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                            : activity.difficulty === 'medium'
                            ? 'bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]'
                            : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
                        }`}>
                          {activity.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded font-medium ${
                          activity.type === 'practice'
                            ? 'bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]'
                            : 'bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]'
                        }`}>
                          {activity.type}
                        </span>
                        {activity.timeLimit && (
                          <span className="px-2 py-1 bg-[#6c7086] bg-opacity-20 text-[#6c7086] rounded flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.timeLimit} min
                          </span>
                        )}
                        {activity.testCases?.length > 0 && (
                          <span className="px-2 py-1 bg-[#6c7086] bg-opacity-20 text-[#6c7086] rounded">
                            {activity.testCases.length} test{activity.testCases.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          {status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-[#a6e3a1]" />
                          ) : status === 'in-progress' ? (
                            <Clock className="w-5 h-5 text-[#f9e2af]" />
                          ) : (
                            <XCircle className="w-5 h-5 text-[#6c7086]" />
                          )}
                          <span className="text-sm text-[#bac2de]">
                            {status === 'completed' ? 'Completed' : status === 'in-progress' ? 'In Progress' : 'Not Started'}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-[#cdd6f4]">
                          {bestScore}%
                        </p>
                        <p className="text-xs text-[#bac2de]">
                          {attemptCount} attempt{attemptCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/student/activity/${activity._id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded-lg transition whitespace-nowrap"
                      >
                        <Play className="w-4 h-4" />
                        {status === 'not-started' ? 'Start' : 'Continue'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentSessionActivities;
