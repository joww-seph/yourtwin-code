import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { activityAPI, submissionAPI } from '../services/api';
import { Code, CheckCircle, Clock, TrendingUp, LogOut, User } from 'lucide-react';
import { BarChart3 } from 'lucide-react';

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
                <p className="font-medium text-[#cdd6f4]">
                  {user?.displayName || `${user?.firstName} ${user?.lastName}`}
                </p>
                <p className="text-sm text-[#bac2de]">
                  {user?.course} {user?.yearLevel}-{user?.section}
                </p>
              </div>
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

        {/* Available Activities */}
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

export default StudentDashboard;