import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI } from '../services/api';
import { Users, BookOpen, AlertCircle, CheckCircle, LogOut, Plus, Calendar, Clock, MapPin } from 'lucide-react';

function InstructorDashboard() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      const handleRefresh = () => {
        console.log('📡 [Instructor Dashboard] Session event received - refreshing');
        fetchSessions();
      };

      socket.on('lab-session-created', handleRefresh);
      socket.on('lab-session-updated', handleRefresh);
      socket.on('lab-session-deleted', handleRefresh);
      socket.on('lab-session-activated', handleRefresh);
      socket.on('lab-session-deactivated', handleRefresh);

      return () => {
        socket.off('lab-session-created');
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
        socket.off('lab-session-activated');
        socket.off('lab-session-deactivated');
      };
    }
  }, [socket]);

  const fetchSessions = async () => {
    try {
      const response = await labSessionAPI.getAll();
      setSessions(response.data.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

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
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.isActive).length;
  const totalActivities = sessions.reduce((sum, s) => sum + (s.activities?.length || 0), 0);
  const totalStudents = sessions.reduce((sum, s) => sum + (s.allowedStudents?.length || 0), 0);

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Header */}
      <header className="bg-[#313244] shadow-lg border-b border-[#45475a]">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <img src="/header.png" alt="YOURTWIN: CODE" className="h-10 w-auto" />
              <h2 className="text-l font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent">
                Instructor Dashboard
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#bac2de]">Welcome, Prof. {user?.firstName} {user?.lastName}</span>
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            title="Lab Sessions"
            value={totalSessions}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Active Sessions"
            value={activeSessions}
            color="green"
          />
          <StatCard
            icon={<AlertCircle className="w-6 h-6" />}
            title="Total Activities"
            value={totalActivities}
            color="yellow"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            title="Enrolled Students"
            value={totalStudents}
            color="purple"
          />
        </div>

        {/* Lab Sessions Management */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg shadow-lg mb-8">
          <div className="p-6 border-b border-[#45475a] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#cdd6f4]">Lab Sessions</h2>
            <button 
              onClick={() => navigate('/instructor/lab-sessions')}
              className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition font-medium text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manage Sessions
            </button>
          </div>
          <div className="p-6">
            {sessions.length === 0 ? (
              <p className="text-[#bac2de] text-center py-8">No lab sessions yet. Create your first session!</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <SessionRow 
                    key={session._id} 
                    session={session}
                    onNavigate={() => navigate(`/instructor/lab-sessions/${session._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function StatCard({ icon, title, value, color }) {
  const colorClasses = {
    blue: 'bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]',
    green: 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]',
    yellow: 'bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]',
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

function SessionRow({ session, onNavigate }) {
  const activitiesCount = session.activities?.length || 0;
  const studentsCount = session.allowedStudents?.length || 0;

  return (
    <div
      className="border border-[#45475a] bg-[#181825] rounded-lg p-4 hover:border-[#89b4fa] transition cursor-pointer group"
      onClick={onNavigate}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium text-[#cdd6f4] text-lg">{session.title}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              session.isActive
                ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
            }`}>
              {session.isActive ? 'Active' : 'Inactive'}
            </span>
            {/* Target audience badge */}
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]">
              {session.course} {session.yearLevel}-{session.section}
            </span>
          </div>
          <p className="text-sm text-[#bac2de] mb-3">{session.description}</p>

          {/* Schedule info */}
          <div className="flex items-center gap-4 text-sm text-[#bac2de] mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" /> {new Date(session.scheduledDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {session.startTime} - {session.endTime}
            </span>
            {session.room && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {session.room}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-[#bac2de]">
            <span className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" /> {activitiesCount} activities
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" /> {studentsCount} students
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          className="px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] rounded-lg transition font-medium text-sm opacity-0 group-hover:opacity-100"
        >
          Manage
        </button>
      </div>
    </div>
  );
}

export default InstructorDashboard;