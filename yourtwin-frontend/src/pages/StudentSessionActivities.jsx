import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI, submissionAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  BookOpen,
  User,
  ArrowLeft
} from 'lucide-react';

function StudentSessionActivities() {
  const { sessionId } = useParams();
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

  useEffect(() => {
    if (sessionId && socket && session) {
      joinLabSession(sessionId, session.title);
    }
  }, [sessionId, socket, session]);

  useEffect(() => {
    if (sessionId && socket) {
      const handleSessionDeleted = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          navigate('/student/dashboard');
        }
      };

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
      if (data.isActive === false) {
        navigate('/student/dashboard');
        return;
      }
      fetchSessionDetails();
    }
  };

  const handleActivityCreated = (data) => {
    if (data.sessionId === sessionId) fetchSessionDetails();
  };

  const handleActivityUpdated = (data) => {
    if (data.sessionId === sessionId) fetchSessionDetails();
  };

  const handleActivityDeleted = (data) => {
    if (data.sessionId === sessionId) fetchSessionDetails();
  };

  const fetchSessionDetails = async () => {
    try {
      const response = await labSessionAPI.getOne(sessionId);
      const sessionData = response.data.data;
      if (!sessionData.isActive) {
        navigate('/student/dashboard');
        return;
      }
      setSession(sessionData);
      setActivities((sessionData.activities || []).filter(a => a != null));
    } catch (error) {
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
      const subActivityId = typeof s.activityId === 'object' ? s.activityId?._id : s.activityId;
      return subActivityId === activityId;
    });
    if (activitySubmissions.length === 0) return 'not-started';
    return activitySubmissions.some(s => s.status === 'passed') ? 'completed' : 'in-progress';
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa]"></div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-[#f38ba8]">Session not found</p>
        </div>
      </Layout>
    );
  }

  const completedCount = activities.filter(a => getActivityStatus(a._id) === 'completed').length;
  const completionRate = activities.length > 0 ? Math.round((completedCount / activities.length) * 100) : 0;

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="p-2 hover:bg-[#313244] rounded-lg transition flex-shrink-0 mt-1"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-[#cdd6f4] truncate">{session.title}</h1>
            <p className="text-sm text-[#a6adc8] mt-1">{session.description}</p>
            {session.instructor && (
              <p className="text-sm text-[#6c7086] mt-2 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                Prof. {typeof session.instructor === 'object'
                  ? `${session.instructor.firstName} ${session.instructor.lastName}`
                  : session.instructor}
              </p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={BookOpen} label="Activities" value={activities.length} color="blue" />
          <StatCard icon={CheckCircle} label="Completed" value={completedCount} color="green" />
          <StatCard icon={Target} label="Progress" value={`${completionRate}%`} color="yellow" />
        </div>

        {/* Activities List */}
        <div className="bg-[#181825] border border-[#313244] rounded-lg">
          <div className="px-4 py-3 border-b border-[#313244]">
            <h2 className="text-sm font-semibold text-[#cdd6f4]">Activities</h2>
          </div>
          {activities.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-[#45475a] mx-auto mb-2" />
              <p className="text-sm text-[#6c7086]">No activities in this session yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#313244]">
              {activities.filter(a => a != null).map((activity, index) => {
                if (!activity || !activity._id) return null;
                const status = getActivityStatus(activity._id);
                const bestScore = getBestScore(activity._id);
                const attemptCount = getAttemptCount(activity._id);

                return (
                  <button
                    key={activity._id}
                    onClick={() => navigate(`/student/activity/${activity._id}`)}
                    className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#313244]/50 transition text-left"
                  >
                    <span className="text-xs font-bold text-[#6c7086] bg-[#313244] px-2 py-1 rounded flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-[#cdd6f4] truncate">{activity.title}</h3>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          activity.difficulty === 'easy' ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' :
                          activity.difficulty === 'medium' ? 'bg-[#f9e2af]/20 text-[#f9e2af]' :
                          'bg-[#f38ba8]/20 text-[#f38ba8]'
                        }`}>{activity.difficulty}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-[#94e2d5]/20 text-[#94e2d5] rounded uppercase">{activity.language}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6c7086]">
                        {activity.topic && <span>{activity.topic}</span>}
                        {activity.timeLimit && (
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{activity.timeLimit}m</span>
                        )}
                        <span>{attemptCount} attempt{attemptCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-[#a6e3a1]" />
                          ) : status === 'in-progress' ? (
                            <Clock className="w-4 h-4 text-[#f9e2af]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#6c7086]" />
                          )}
                          <span className={`text-sm font-bold ${
                            status === 'completed' ? 'text-[#a6e3a1]' :
                            status === 'in-progress' ? 'text-[#f9e2af]' : 'text-[#6c7086]'
                          }`}>{bestScore}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-[#89b4fa]/20 text-[#89b4fa] rounded text-xs font-medium">
                        <Play className="w-3 h-3" />
                        {status === 'not-started' ? 'Start' : 'Continue'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'text-[#89b4fa] bg-[#89b4fa]/10',
    green: 'text-[#a6e3a1] bg-[#a6e3a1]/10',
    yellow: 'text-[#f9e2af] bg-[#f9e2af]/10',
  };

  return (
    <div className="bg-[#181825] border border-[#313244] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-[#6c7086]">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#cdd6f4]">{value}</p>
    </div>
  );
}

export default StudentSessionActivities;
