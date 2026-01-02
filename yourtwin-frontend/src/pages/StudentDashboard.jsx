import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI, submissionAPI, twinAPI } from '../services/api';
import Layout from '../components/Layout';
import SystemAlertModal, { useSystemAlert } from '../components/SystemAlertModal';
import {
  Code,
  CheckCircle,
  Clock,
  TrendingUp,
  User,
  Brain,
  Calendar,
  ChevronRight,
  Zap,
  Target,
  BookOpen,
  Play,
  ArrowUpRight
} from 'lucide-react';
import { showError } from '../utils/sweetalert';

function StudentDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [twinData, setTwinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showAlert, closeAlert } = useSystemAlert();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsRes, submissionsRes, twinRes] = await Promise.all([
        labSessionAPI.getAll(),
        submissionAPI.getAll(),
        twinAPI.getProfile().catch(() => ({ data: { data: null } }))
      ]);
      const sessions = sessionsRes.data.data || [];
      const activeOnly = sessions.filter(s => s.isActive);
      setSessions(activeOnly);
      setSubmissions(submissionsRes.data.data || []);
      setTwinData(twinRes.data.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      const handleSessionUpdate = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await labSessionAPI.getAll();
          const fetchedSessions = res.data.data || [];
          setSessions(fetchedSessions.filter(s => s.isActive));
        } catch (err) {
          console.error('Failed to refresh sessions:', err.message);
        }
      };

      const handleSubmissionResult = async (data) => {
        console.log('📡 My submission result:', data);
        // Refresh submissions to show the latest result
        try {
          const res = await submissionAPI.getAll();
          setSubmissions(res.data.data || []);
        } catch (err) {
          console.error('Failed to refresh submissions:', err.message);
        }
        // Also refresh twin data as it may have updated
        try {
          const twinRes = await twinAPI.getProfile();
          setTwinData(twinRes.data.data);
        } catch (err) {
          console.error('Failed to refresh twin data:', err.message);
        }
      };

      socket.on('lab-session-created', handleSessionUpdate);
      socket.on('lab-session-activated', handleSessionUpdate);
      socket.on('lab-session-deactivated', handleSessionUpdate);
      socket.on('lab-session-updated', handleSessionUpdate);
      socket.on('lab-session-deleted', handleSessionUpdate);
      socket.on('lab-session-status-change', handleSessionUpdate); // Auto-activation/deactivation
      socket.on('my-submission-result', handleSubmissionResult);

      return () => {
        socket.off('lab-session-created');
        socket.off('lab-session-activated');
        socket.off('lab-session-deactivated');
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
        socket.off('lab-session-status-change');
        socket.off('my-submission-result');
      };
    }
  }, [socket]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa]"></div>
        </div>
      </Layout>
    );
  }

  // Calculate stats
  const totalActivities = sessions.reduce((sum, s) => sum + (s.activities?.length || 0), 0);
  const allActivityIds = sessions.flatMap(s => (s.activities || []).map(a => a._id || a));
  const completedActivities = allActivityIds.filter(activityId =>
    submissions.some(sub => {
      const subActivityId = typeof sub.activityId === 'object' ? sub.activityId?._id : sub.activityId;
      return subActivityId === activityId && sub.status === 'passed';
    })
  ).length;

  // Get recent submissions
  const recentSubmissions = [...submissions]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <Layout>
      {/* System Alert Modal for first-time students */}
      {showAlert && <SystemAlertModal onClose={closeAlert} />}

      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#89b4fa] font-medium mb-1">Student Dashboard</p>
            <h1 className="text-xl font-bold text-[#cdd6f4]">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-sm text-[#6c7086]">Ready to continue coding?</p>
          </div>
          <div className="flex gap-2">
            <QuickAction
              icon={Code}
              label="Sandbox"
              onClick={() => navigate('/student/sandbox')}
              color="blue"
            />
            <QuickAction
              icon={Brain}
              label="Twin"
              onClick={() => navigate('/student/twin')}
              color="purple"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={Calendar}
            label="Active Sessions"
            value={sessions.length}
            color="green"
          />
          <StatCard
            icon={BookOpen}
            label="Activities"
            value={totalActivities}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={completedActivities}
            color="purple"
          />
          <StatCard
            icon={Zap}
            label="Velocity"
            value={twinData?.learningVelocity || 0}
            color="yellow"
            suffix=""
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sessions - Takes 2 columns */}
          <div className="lg:col-span-2 bg-[#181825] rounded-lg border border-[#313244]">
            <div className="px-4 py-3 border-b border-[#313244] flex items-center justify-between">
              <h2 className="font-semibold text-[#cdd6f4] text-sm">My Sessions</h2>
              <span className="text-xs text-[#6c7086]">{sessions.length} active</span>
            </div>
            <div className="divide-y divide-[#313244] max-h-[400px] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-[#6c7086] text-sm">
                  No active sessions. Ask your instructor to enroll you.
                </div>
              ) : (
                sessions.map((session) => (
                  <SessionRow key={session._id} session={session} submissions={submissions} />
                ))
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Quick Stats from Twin */}
            {twinData && (
              <div className="bg-[#181825] rounded-lg border border-[#313244] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-[#cba6f7]" />
                  <h3 className="font-semibold text-[#cdd6f4] text-sm">Your Profile</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6c7086]">Proficiency</span>
                    <span className="text-[#cdd6f4]">{twinData.avgProficiency || 0}%</span>
                  </div>
                  <div className="w-full bg-[#313244] rounded-full h-1.5">
                    <div
                      className="bg-[#89b4fa] h-1.5 rounded-full transition-all"
                      style={{ width: `${twinData.avgProficiency || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6c7086]">AI Independence</span>
                    <span className={`${
                      twinData.aiDependency?.independence === 'high' ? 'text-[#a6e3a1]' :
                      twinData.aiDependency?.independence === 'moderate' ? 'text-[#f9e2af]' :
                      'text-[#fab387]'
                    }`}>
                      {twinData.aiDependency?.independence || 'N/A'}
                    </span>
                  </div>
                  {twinData.strengths?.length > 0 && (
                    <div className="pt-2 border-t border-[#313244]">
                      <p className="text-xs text-[#6c7086] mb-1">Strengths</p>
                      <div className="flex flex-wrap gap-1">
                        {twinData.strengths.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-[#a6e3a1]/20 text-[#a6e3a1] rounded text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate('/student/twin')}
                  className="mt-3 w-full text-xs text-[#89b4fa] hover:text-[#b4befe] flex items-center justify-center gap-1"
                >
                  View Full Profile <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-[#181825] rounded-lg border border-[#313244]">
              <div className="px-4 py-3 border-b border-[#313244]">
                <h3 className="font-semibold text-[#cdd6f4] text-sm">Recent Activity</h3>
              </div>
              <div className="divide-y divide-[#313244]">
                {recentSubmissions.length === 0 ? (
                  <div className="p-4 text-center text-[#6c7086] text-sm">
                    No submissions yet
                  </div>
                ) : (
                  recentSubmissions.map((sub) => (
                    <div key={sub._id} className="px-4 py-2 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#cdd6f4] truncate">
                          {sub.activityId?.title || 'Activity'}
                        </p>
                        <p className="text-xs text-[#6c7086]">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          sub.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'
                        }`}>
                          {sub.score}%
                        </span>
                        {sub.status === 'passed' && (
                          <CheckCircle className="w-4 h-4 text-[#a6e3a1]" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {recentSubmissions.length > 0 && (
                <button
                  onClick={() => navigate('/student/progress')}
                  className="w-full px-4 py-2 text-xs text-[#89b4fa] hover:bg-[#313244] border-t border-[#313244]"
                >
                  View All Progress
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Compact stat card
function StatCard({ icon: Icon, label, value, color, suffix = '' }) {
  const colors = {
    green: 'text-[#a6e3a1] bg-[#a6e3a1]/10',
    blue: 'text-[#89b4fa] bg-[#89b4fa]/10',
    purple: 'text-[#cba6f7] bg-[#cba6f7]/10',
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
      <p className="text-xl font-bold text-[#cdd6f4]">{value}{suffix}</p>
    </div>
  );
}

// Quick action button
function QuickAction({ icon: Icon, label, onClick, color }) {
  const colors = {
    blue: 'bg-[#89b4fa]/10 text-[#89b4fa] hover:bg-[#89b4fa]/20',
    purple: 'bg-[#cba6f7]/10 text-[#cba6f7] hover:bg-[#cba6f7]/20',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${colors[color]}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Session row component
function SessionRow({ session, submissions }) {
  const navigate = useNavigate();
  const activityIds = (session.activities || []).map(a => a._id || a);
  const completed = activityIds.filter(id =>
    submissions.some(sub => {
      const subId = typeof sub.activityId === 'object' ? sub.activityId?._id : sub.activityId;
      return subId === id && sub.status === 'passed';
    })
  ).length;

  const progress = activityIds.length > 0 ? Math.round((completed / activityIds.length) * 100) : 0;

  const handleClick = () => {
    if (!session.isActive) {
      showError('Session is not active', 'You cannot access this session');
      return;
    }
    navigate(`/student/session/${session._id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#313244]/50 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#89b4fa]/20 to-[#cba6f7]/20 flex items-center justify-center flex-shrink-0">
        <Calendar className="w-5 h-5 text-[#89b4fa]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[#cdd6f4] text-sm truncate">{session.title}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[#a6e3a1]/20 text-[#a6e3a1] flex-shrink-0">
            Active
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-[#6c7086]">
          <span>{session.activities?.length || 0} activities</span>
          <span>•</span>
          <span>{completed}/{activityIds.length} done</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-1.5 bg-[#313244] rounded-full hidden sm:block">
          <div
            className="h-full bg-[#a6e3a1] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ChevronRight className="w-4 h-4 text-[#6c7086]" />
      </div>
    </button>
  );
}

export default StudentDashboard;
