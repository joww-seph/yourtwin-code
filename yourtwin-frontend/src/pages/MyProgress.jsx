import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { labSessionAPI, submissionAPI } from '../services/api';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Code,
  Flame,
  Award,
  BarChart3
} from 'lucide-react';

function MyProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      // Fetch all data in parallel
      const [sessionsRes, submissionsRes, statsRes] = await Promise.all([
        labSessionAPI.getAll(),
        submissionAPI.getAll(),
        submissionAPI.getStats()
      ]);
      setSessions(sessionsRes.data.data);
      setSubmissions(submissionsRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  // Helper to get completed activities for a session
  const getCompletedActivitiesForSession = (session) => {
    if (!session || !session.activities) return 0;
    const sessionActivityIds = (session.activities || [])
      .filter(a => a != null)
      .map(a => a._id || a);
    return sessionActivityIds.filter(activityId => {
      return (submissions || []).some(sub => {
        if (!sub || !sub.activityId) return false;
        const subActivityId = typeof sub.activityId === 'object' ? sub.activityId?._id : sub.activityId;
        return subActivityId === activityId && sub.status === 'passed';
      });
    }).length;
  };

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
                My Progress
              </h1>
              <p className="text-sm text-[#bac2de] mt-1">
                {user?.displayName || `${user?.firstName} ${user?.lastName}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#89b4fa] bg-opacity-20 rounded-lg">
                <Code className="w-6 h-6 text-[#89b4fa]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Total Submissions</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">{stats?.overview?.totalSubmissions || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#a6e3a1] bg-opacity-20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-[#a6e3a1]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Activities Passed</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {stats?.overview?.passedActivities || 0}/{stats?.overview?.totalActivities || 0}
                </p>
              </div>
            </div>
            <div className="w-full bg-[#45475a] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#a6e3a1] to-[#89b4fa] h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats?.overview?.passRate || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#f9e2af] bg-opacity-20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-[#f9e2af]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Average Score</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {stats?.overview?.avgScore || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#fab387] bg-opacity-20 rounded-lg">
                <Flame className="w-6 h-6 text-[#fab387]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Current Streak</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {stats?.streakData?.currentStreak || 0} days
                </p>
                {stats?.streakData?.longestStreak > 0 && (
                  <p className="text-xs text-[#6c7086]">Best: {stats.streakData.longestStreak} days</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Activity Chart */}
        {stats?.weeklyActivity && stats.weeklyActivity.length > 0 && (
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#89b4fa]" />
              Weekly Activity
            </h2>
            <div className="flex items-end justify-between gap-2 h-32">
              {stats.weeklyActivity.map((day, idx) => {
                const maxSubmissions = Math.max(...stats.weeklyActivity.map(d => d.submissions), 1);
                const height = (day.submissions / maxSubmissions) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end h-24">
                      <div
                        className="w-full max-w-[40px] rounded-t transition-all duration-300"
                        style={{
                          height: `${Math.max(height, 4)}%`,
                          background: day.passed > 0
                            ? 'linear-gradient(to top, #a6e3a1, #89b4fa)'
                            : day.submissions > 0
                            ? '#89b4fa'
                            : '#45475a'
                        }}
                        title={`${day.submissions} submissions, ${day.passed} passed`}
                      />
                    </div>
                    <span className="text-xs text-[#6c7086]">{day.day}</span>
                    <span className="text-xs text-[#bac2de] font-medium">{day.submissions}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Topic Performance */}
        {stats?.topicPerformance && stats.topicPerformance.length > 0 && (
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#cba6f7]" />
              Performance by Topic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.topicPerformance.map((topic, idx) => (
                <div key={idx} className="bg-[#1e1e2e] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-[#cdd6f4]">{topic.topic}</span>
                    <span className="text-sm text-[#a6e3a1]">{topic.passRate}% pass</span>
                  </div>
                  <div className="w-full bg-[#45475a] rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${topic.passRate}%`,
                        background: topic.passRate >= 80 ? '#a6e3a1' : topic.passRate >= 50 ? '#f9e2af' : '#f38ba8'
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#6c7086]">
                    <span>{topic.attempts} attempts</span>
                    <span>Avg: {topic.avgScore}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Submissions */}
        {stats?.recentSubmissions && stats.recentSubmissions.length > 0 && (
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#f9e2af]" />
              Recent Submissions
            </h2>
            <div className="space-y-3">
              {stats.recentSubmissions.slice(0, 5).map((sub) => (
                <div key={sub._id} className="flex items-center justify-between bg-[#1e1e2e] rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {sub.status === 'passed' ? (
                      <CheckCircle className="w-5 h-5 text-[#a6e3a1]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#f38ba8]" />
                    )}
                    <div>
                      <p className="font-medium text-[#cdd6f4]">{sub.activityTitle}</p>
                      <p className="text-xs text-[#6c7086]">
                        {sub.activityTopic} • Attempt #{sub.attemptNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${sub.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'}`}>
                      {sub.score}%
                    </p>
                    <p className="text-xs text-[#6c7086]">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lab Sessions Progress */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#cdd6f4] mb-6">Lab Sessions</h2>
          
          {sessions.length === 0 ? (
            <p className="text-center text-[#6c7086] py-8">
              No lab sessions enrolled yet. Check back soon!
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionActivities = session.activities || [];
                const completedActivitiesCount = getCompletedActivitiesForSession(session);

                return (
                  <div
                    key={session._id}
                    className="border border-[#45475a] rounded-lg p-4 hover:border-[#585b70] transition cursor-pointer"
                    onClick={() => navigate(`/student/session/${session._id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-[#cdd6f4] mb-1">
                          {session.title}
                        </h3>
                        <p className="text-sm text-[#bac2de] mb-3">
                          {session.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-[#bac2de]">
                          <span className="px-2 py-0.5 rounded text-xs bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]">
                            {sessionActivities.length} activities
                          </span>
                          <span>•</span>
                          <span>
                            {session.isActive ? '🔵 Active' : '⚫ Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {completedActivitiesCount === sessionActivities.length && sessionActivities.length > 0 ? (
                          <CheckCircle className="w-5 h-5 text-[#a6e3a1]" />
                        ) : (
                          <Clock className="w-5 h-5 text-[#f9e2af]" />
                        )}
                        <span className="text-lg font-bold text-[#cdd6f4]">
                          {completedActivitiesCount}/{sessionActivities.length}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-[#45475a] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${sessionActivities.length > 0 ? (completedActivitiesCount / sessionActivities.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default MyProgress;