import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI } from '../services/api';
import { Code, CheckCircle, Clock, TrendingUp, LogOut } from 'lucide-react';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch activities from backend
  useEffect(() => {
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

    fetchActivities();
  }, []);

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
  const completedActivities = activities.filter(a => a.status === 'completed').length;
  const totalActivities = activities.length;
  const practiceActivities = activities.filter(a => a.type === 'practice');
  const finalActivities = activities.filter(a => a.type === 'final');

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
                <p className="font-medium text-[#cdd6f4]">{user?.name}</p>
                <p className="text-sm text-[#bac2de]">
                  {user?.course} {user?.yearLevel}-{user?.section}
                </p>
              </div>
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
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
          <p className="text-[#11111b]">Ready to continue your coding journey?</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<CheckCircle className="w-8 h-8" />}
            title="Activities Available"
            value={`${totalActivities}`}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-8 h-8" />}
            title="Practice Activities"
            value={`${practiceActivities.length}`}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Final Activities"
            value={`${finalActivities.length}`}
            color="purple"
          />
        </div>

        {/* Competency Progress
        <div className="bg-[#313244] rounded-lg shadow-lg border border-[#45475a] p-6 mb-8">
          <h3 className="text-xl font-bold text-[#cdd6f4] mb-4">Your Progress</h3>
          <div className="space-y-4">
            <CompetencyBar topic="Arrays" level={0.68} />
            <CompetencyBar topic="Loops" level={0.65} />
            <CompetencyBar topic="Functions" level={0.45} />
          </div>
        </div> */}

        {/* Today's Activities */}
        <div className="bg-[#313244] rounded-lg shadow-lg border border-[#45475a] p-6">
          <h3 className="text-xl font-bold text-[#cdd6f4] mb-4">Available Activities</h3>
          {activities.length === 0 ? (
            <p className="text-[#bac2de] text-center py-8">No activities available yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <ActivityCard 
                  key={activity._id}
                  activity={activity}
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

function CompetencyBar({ topic, level }) {
  const percentage = Math.round(level * 100);
  const color = level >= 0.7 ? 'bg-[#a6e3a1]' : level >= 0.4 ? 'bg-[#f9e2af]' : 'bg-[#f38ba8]';

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="font-medium text-[#cdd6f4]">{topic}</span>
        <span className="text-[#bac2de]">{percentage}%</span>
      </div>
      <div className="w-full bg-[#45475a] rounded-full h-3">
        <div 
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

function ActivityCard({ activity }) {
  const navigate = useNavigate();

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
    <div className="border border-[#45475a] bg-[#181825] rounded-lg p-4 flex items-center justify-between hover:shadow-md hover:border-[#89b4fa] transition">
      <div className="flex items-start gap-3 flex-1">
        <Code className="w-5 h-5 text-[#89b4fa] mt-1" />
        <div className="flex-1">
          <p className="font-medium text-[#cdd6f4] mb-1">{activity.title}</p>
          <p className="text-sm text-[#bac2de] mb-2 line-clamp-2">{activity.description}</p>
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeStyles[activity.type]}`}>
              {activity.type}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyStyles[activity.difficulty]}`}>
              {activity.difficulty}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#6c7086] bg-opacity-20 text-[#bac2de]">
              {activity.language.toUpperCase()}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]">
              {activity.topic}
            </span>
          </div>
        </div>
      </div>
      <button onClick={handleStart} className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition text-sm font-medium">
        Start
      </button>
    </div>
  );
}

export default StudentDashboard;