import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  Users,
  BookOpen,
  CheckCircle,
  Plus,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Activity,
  Circle,
  Zap
} from 'lucide-react';

function InstructorDashboard() {
  const { user } = useAuth();
  const { socket, onlineCount, recentActivity, isConnected } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleRefresh = () => fetchSessions();
      socket.on('lab-session-created', handleRefresh);
      socket.on('lab-session-updated', handleRefresh);
      socket.on('lab-session-deleted', handleRefresh);
      socket.on('lab-session-activated', handleRefresh);
      socket.on('lab-session-deactivated', handleRefresh);
      socket.on('lab-session-status-change', handleRefresh); // Auto-activation/deactivation

      return () => {
        socket.off('lab-session-created');
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
        socket.off('lab-session-activated');
        socket.off('lab-session-deactivated');
        socket.off('lab-session-status-change');
      };
    }
  }, [socket]);

  const fetchSessions = async () => {
    try {
      const response = await labSessionAPI.getAll();
      setSessions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
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

  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.isActive).length;
  const totalActivities = sessions.reduce((sum, s) => sum + (s.activities?.length || 0), 0);
  const totalStudents = sessions.reduce((sum, s) => sum + (s.allowedStudents?.length || 0), 0);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#a6e3a1] font-medium mb-1">Instructor Dashboard</p>
            <h1 className="text-2xl font-bold text-[#cdd6f4]">
              Welcome, Prof. {user?.lastName}
            </h1>
            <p className="text-base text-[#6c7086]">Manage your lab sessions and monitor students</p>
          </div>
          <button
            onClick={() => navigate('/instructor/lab-sessions/create')}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition font-medium text-base"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>

        {/* Stats + Online Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={BookOpen} label="Sessions" value={totalSessions} color="blue" />
          <StatCard icon={CheckCircle} label="Active" value={activeSessions} color="green" />
          <StatCard icon={Zap} label="Activities" value={totalActivities} color="yellow" />
          <StatCard icon={Users} label="Students" value={totalStudents} color="purple" />
          <OnlineCard count={onlineCount?.studentsOnline || 0} isConnected={isConnected} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sessions Panel - Takes 2 columns */}
          <div className="lg:col-span-2 bg-[#181825] rounded-lg border border-[#313244]">
            <div className="px-5 py-4 border-b border-[#313244] flex items-center justify-between">
              <h2 className="font-semibold text-[#cdd6f4] text-base">Lab Sessions</h2>
              <button
                onClick={() => navigate('/instructor/lab-sessions')}
                className="text-sm text-[#89b4fa] hover:text-[#b4befe]"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-[#313244] max-h-[500px] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-center text-[#6c7086] text-sm">
                  No lab sessions yet. Create your first session to get started.
                </div>
              ) : (
                sessions.slice(0, 6).map((session) => (
                  <SessionRow key={session._id} session={session} />
                ))
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-[#181825] rounded-lg border border-[#313244]">
            <div className="px-5 py-4 border-b border-[#313244] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#a6e3a1]" />
                <h3 className="font-semibold text-[#cdd6f4] text-base">Live Activity</h3>
                {isConnected && (
                  <span className="w-2.5 h-2.5 bg-[#a6e3a1] rounded-full animate-pulse"></span>
                )}
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center">
                  <Activity className="w-6 h-6 text-[#45475a] mx-auto mb-2" />
                  <p className="text-xs text-[#6c7086]">
                    {isConnected ? 'Waiting for activity...' : 'Connecting...'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#313244]">
                  {recentActivity.slice(0, 10).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Stat card with improved sizing
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    green: 'text-[#a6e3a1] bg-[#a6e3a1]/10',
    blue: 'text-[#89b4fa] bg-[#89b4fa]/10',
    purple: 'text-[#cba6f7] bg-[#cba6f7]/10',
    yellow: 'text-[#f9e2af] bg-[#f9e2af]/10',
  };

  return (
    <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-[#6c7086]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#cdd6f4]">{value}</p>
    </div>
  );
}

// Online students card
function OnlineCard({ count, isConnected }) {
  return (
    <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 rounded-lg bg-[#a6e3a1]/10">
          {isConnected ? (
            <Circle className="w-5 h-5 text-[#a6e3a1] fill-[#a6e3a1]" />
          ) : (
            <Circle className="w-5 h-5 text-[#6c7086]" />
          )}
        </div>
        <span className="text-sm text-[#6c7086]">Online</span>
      </div>
      <p className="text-2xl font-bold text-[#cdd6f4]">{count}</p>
    </div>
  );
}

// Session row component
function SessionRow({ session }) {
  const navigate = useNavigate();
  const activitiesCount = session.activities?.length || 0;
  const studentsCount = session.allowedStudents?.length || 0;

  return (
    <button
      onClick={() => navigate(`/instructor/lab-sessions/${session._id}`)}
      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#313244]/50 transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#89b4fa]/20 to-[#cba6f7]/20 flex items-center justify-center flex-shrink-0">
        <Calendar className="w-6 h-6 text-[#89b4fa]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[#cdd6f4] text-base truncate">{session.title}</h3>
          <span className={`text-sm px-2 py-0.5 rounded flex-shrink-0 ${
            session.isActive
              ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]'
              : 'bg-[#f38ba8]/20 text-[#f38ba8]'
          }`}>
            {session.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1.5 text-sm text-[#6c7086]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {new Date(session.scheduledDate).toLocaleDateString()}
          </span>
          <span>{activitiesCount} activities</span>
          <span>{studentsCount} students</span>
          {session.room && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {session.room}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-[#6c7086] flex-shrink-0" />
    </button>
  );
}

// Activity item component
function ActivityItem({ activity }) {
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffSeconds = Math.floor((now - then) / 1000);
    if (diffSeconds < 60) return 'now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
    return then.toLocaleDateString();
  };

  const getIcon = () => {
    switch (activity.type) {
      case 'submission':
        return activity.status === 'passed' ? (
          <CheckCircle className="w-4 h-4 text-[#a6e3a1]" />
        ) : (
          <Circle className="w-4 h-4 text-[#f38ba8]" />
        );
      case 'hint':
        return <Zap className="w-4 h-4 text-[#f9e2af]" />;
      case 'join':
        return <Users className="w-4 h-4 text-[#89b4fa]" />;
      default:
        return <Activity className="w-4 h-4 text-[#6c7086]" />;
    }
  };

  const getMessage = () => {
    switch (activity.type) {
      case 'submission':
        return (
          <>
            <span className="font-medium text-[#cdd6f4]">{activity.studentName}</span>
            <span className="text-[#6c7086]"> submitted </span>
            <span className={activity.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'}>
              {activity.score}%
            </span>
          </>
        );
      case 'hint':
        return (
          <>
            <span className="font-medium text-[#cdd6f4]">{activity.studentName}</span>
            <span className="text-[#6c7086]"> asked for L{activity.hintLevel} hint</span>
          </>
        );
      case 'join':
        return (
          <>
            <span className="font-medium text-[#cdd6f4]">{activity.studentName}</span>
            <span className="text-[#6c7086]"> joined session</span>
          </>
        );
      default:
        return <span className="text-[#6c7086]">Unknown activity</span>;
    }
  };

  return (
    <div className="px-4 py-2 flex items-center gap-3">
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{getMessage()}</p>
      </div>
      <span className="text-xs text-[#6c7086] flex-shrink-0">
        {getRelativeTime(activity.timestamp)}
      </span>
    </div>
  );
}

export default InstructorDashboard;
