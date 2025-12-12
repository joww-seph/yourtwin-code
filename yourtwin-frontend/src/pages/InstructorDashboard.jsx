import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI } from '../services/api';
import { Users, Activity, AlertCircle, CheckCircle, LogOut, Plus } from 'lucide-react';

function InstructorDashboard() {
  const { user, logout } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

    useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await activityAPI.getAll();
      setActivities(response.data.data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
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
  const totalActivities = activities.length;
  const practiceActivities = activities.filter(a => a.type === 'practice').length;
  const finalActivities = activities.filter(a => a.type === 'final').length;

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
              <span className="text-sm text-[#bac2de]">Welcome, {user?.name}</span>
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
            icon={<Activity className="w-6 h-6" />}
            title="Total Activities"
            value={totalActivities}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            title="Practice Activities"
            value={practiceActivities}
            color="green"
          />
          <StatCard
            icon={<AlertCircle className="w-6 h-6" />}
            title="Final Activities"
            value={finalActivities}
            color="red"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            title="Students"
            value="0"
            color="purple"
          />
        </div>

        {/* Activity Management */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg shadow-lg mb-8">
          <div className="p-6 border-b border-[#45475a] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#cdd6f4]">Activity Management</h2>
            <button className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition font-medium text-sm">
              <Plus className="w-4 h-4" />
              Create Activity
            </button>
          </div>
          <div className="p-6">
            {activities.length === 0 ? (
              <p className="text-[#bac2de] text-center py-8">No activities yet. Create your first activity!</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <ActivityRow key={activity._id} activity={activity} />
                ))}
              </div>
            )}
          </div>
        </div>
          
        {/* Placeholder for Real-Time Monitor */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg shadow-lg mb-8">
          <div className="p-6 border-b border-[#45475a] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#cdd6f4]">Real-Time Student Monitor</h2>
            <p className="text-sm text-[#bac2de] mt-1">
              Live monitoring will appear here during lab sessions
            </p>
          </div>
          <div className="p-6">
            <p className="text-[#bac2de] text-center py-12">
              No active lab session
            </p>
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
    red: 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]',
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

function ActivityRow({ activity }) {
  const typeStyles = {
    practice: 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1] border border-[#a6e3a1] border-opacity-30',
    final: 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8] border border-[#f38ba8] border-opacity-30'
  };

  return (
    <div className="border border-[#45475a] bg-[#181825] rounded-lg p-4 hover:border-[#89b4fa] transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-[#cdd6f4] mb-1">{activity.title}</h4>
          <div className="flex items-center gap-3 text-sm text-[#bac2de]">
            <span>{activity.topic}</span>
            <span>•</span>
            <span>{activity.language.toUpperCase()}</span>
            <span>•</span>
            <span>{activity.difficulty}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${typeStyles[activity.type]}`}>
              {activity.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 text-sm text-[#89b4fa] hover:bg-[#89b4fa] hover:bg-opacity-10 rounded transition">
            Edit
          </button>
          <button className="px-3 py-1 text-sm text-[#f38ba8] hover:bg-[#f38ba8] hover:bg-opacity-10 rounded transition">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentCard({ name, activity, status, aiRequests }) {
  const statusStyles = {
    progress: 'border-[#a6e3a1] border-opacity-50 bg-[#a6e3a1] bg-opacity-10',
    struggling: 'border-[#f9e2af] border-opacity-50 bg-[#f9e2af] bg-opacity-10',
    lockdown: 'border-[#cba6f7] border-opacity-50 bg-[#cba6f7] bg-opacity-10'
  };

  const statusDots = {
    progress: 'bg-[#a6e3a1]',
    struggling: 'bg-[#f9e2af]',
    lockdown: 'bg-[#cba6f7]'
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${statusStyles[status]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusDots[status]} animate-pulse`}></div>
            <p className="font-medium text-[#cdd6f4]">{name}</p>
          </div>
          <p className="text-sm text-[#bac2de] mt-1">{activity}</p>
        </div>
      </div>
      <div className="text-xs text-[#9399b2]">
        AI Requests: {aiRequests}
      </div>
    </div>
  );
}

function AlertItem({ type, student, message, time }) {
  const typeStyles = {
    warning: 'bg-[#f9e2af] bg-opacity-20 border-[#f9e2af] border-opacity-30 text-[#f9e2af]',
    danger: 'bg-[#f38ba8] bg-opacity-20 border-[#f38ba8] border-opacity-30 text-[#f38ba8]',
    info: 'bg-[#89b4fa] bg-opacity-20 border-[#89b4fa] border-opacity-30 text-[#89b4fa]'
  };

  return (
    <div className="p-4 hover:bg-[#181825] transition">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#9399b2] mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-[#cdd6f4]">{student}</p>
          <p className="text-sm text-[#bac2de] mt-1">{message}</p>
          <p className="text-xs text-[#9399b2] mt-2">{time}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium border ${typeStyles[type]}`}>
          {type}
        </span>
      </div>
    </div>
  );
}

export default InstructorDashboard;