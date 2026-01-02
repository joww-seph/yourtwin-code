import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { analyticsAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Calendar,
  Activity,
  RefreshCw,
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function AnalyticsDashboard() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [analytics, setAnalytics] = useState(null);
  const [liveActivity, setLiveActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchLiveActivity();
  }, []);

  // Listen for real-time events
  useEffect(() => {
    if (socket) {
      const handleNewSubmission = (data) => {
        console.log('📡 New submission received:', data);
        // Add to live activity
        setLiveActivity(prev => [{
          _id: data.submissionId,
          type: 'submission',
          studentName: data.studentName,
          activityTitle: data.activityTitle,
          score: data.score,
          status: data.status,
          timestamp: data.timestamp
        }, ...prev.slice(0, 49)]);

        // Refresh analytics
        fetchAnalytics();
      };

      const handleHintRequested = (data) => {
        console.log('📡 Hint requested:', data);
        // Add to live activity
        setLiveActivity(prev => [{
          _id: data.hintId || Date.now(),
          type: 'hint',
          studentName: data.studentName,
          activityTitle: data.activityTitle,
          hintLevel: data.hintLevel,
          timestamp: data.timestamp
        }, ...prev.slice(0, 49)]);
      };

      const handleStudentJoined = (data) => {
        console.log('📡 Student joined session:', data);
        // Add to live activity
        setLiveActivity(prev => [{
          _id: Date.now(),
          type: 'join',
          studentName: data.studentName,
          sessionTitle: data.sessionTitle,
          timestamp: data.timestamp
        }, ...prev.slice(0, 49)]);
      };

      socket.on('submission-created', handleNewSubmission);
      socket.on('hint-requested', handleHintRequested);
      socket.on('student-joined-session', handleStudentJoined);

      return () => {
        socket.off('submission-created');
        socket.off('hint-requested');
        socket.off('student-joined-session');
      };
    }
  }, [socket]);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getOverview();
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveActivity = async () => {
    try {
      const response = await analyticsAPI.getLiveActivity();
      setLiveActivity(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch live activity:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAnalytics(), fetchLiveActivity()]);
    setRefreshing(false);
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

  const { overview, dailyStats, topicPerformance, difficultyBreakdown, recentSubmissions } = analytics || {};

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/instructor/dashboard')}
              className="p-2 hover:bg-[#313244] rounded-lg transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#cdd6f4]">Analytics Dashboard</h1>
              <p className="text-sm text-[#a6adc8]">Real-time insights into student performance</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#313244] hover:bg-[#45475a] rounded-lg transition text-sm text-[#cdd6f4]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={<BookOpen className="w-5 h-5" />}
            label="Sessions"
            value={overview?.totalSessions || 0}
            subValue={`${overview?.activeSessions || 0} active`}
            color="#89b4fa"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Students"
            value={overview?.totalEnrolled || 0}
            subValue={`${overview?.activeToday || 0} active today`}
            color="#a6e3a1"
          />
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Submissions"
            value={overview?.totalSubmissions || 0}
            color="#f9e2af"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Passed"
            value={overview?.passedSubmissions || 0}
            subValue={`${overview?.passRate || 0}% rate`}
            color="#a6e3a1"
          />
          <StatCard
            icon={<XCircle className="w-5 h-5" />}
            label="Failed"
            value={overview?.failedSubmissions || 0}
            color="#f38ba8"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Score"
            value={`${overview?.avgScore || 0}%`}
            color="#cba6f7"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Activity Chart */}
          <div className="lg:col-span-2 bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#89b4fa]" />
              Submissions This Week
            </h2>
            {dailyStats && dailyStats.length > 0 ? (
              <div className="flex items-end justify-between gap-2 h-48">
                {dailyStats.map((day, idx) => {
                  const maxSubs = Math.max(...dailyStats.map(d => d.submissions), 1);
                  const height = (day.submissions / maxSubs) * 100;
                  const passedHeight = day.submissions > 0 ? (day.passed / day.submissions) * height : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center justify-end h-36 relative">
                        {/* Total bar */}
                        <div
                          className="w-full max-w-[50px] bg-[#45475a] rounded-t absolute bottom-0"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                        {/* Passed overlay */}
                        <div
                          className="w-full max-w-[50px] bg-gradient-to-t from-[#a6e3a1] to-[#89b4fa] rounded-t absolute bottom-0"
                          style={{ height: `${passedHeight}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#6c7086]">{day.day}</span>
                      <div className="text-center">
                        <span className="text-sm font-medium text-[#cdd6f4]">{day.submissions}</span>
                        <span className="text-xs text-[#a6e3a1] block">{day.passed} passed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#6c7086] text-center py-12">No submission data yet</p>
            )}
          </div>

          {/* Live Activity Feed */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#f9e2af]" />
              Live Activity
              <span className="ml-auto w-2 h-2 bg-[#a6e3a1] rounded-full animate-pulse"></span>
            </h2>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {liveActivity.length > 0 ? (
                liveActivity.slice(0, 10).map((item) => (
                  <div key={item._id} className="flex items-start gap-3 p-2 bg-[#1e1e2e] rounded-lg">
                    {item.status === 'passed' ? (
                      <CheckCircle className="w-4 h-4 text-[#a6e3a1] mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#f38ba8] mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#cdd6f4] truncate">{item.studentName}</p>
                      <p className="text-xs text-[#6c7086] truncate">{item.activityTitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-medium ${item.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'}`}>
                        {item.score}%
                      </p>
                      <p className="text-xs text-[#6c7086]">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[#6c7086] text-center py-8 text-sm">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Topic Performance */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#cba6f7]" />
              Performance by Topic
            </h2>
            {topicPerformance && topicPerformance.length > 0 ? (
              <div className="space-y-4">
                {topicPerformance.map((topic, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#cdd6f4]">{topic.topic}</span>
                      <span className="text-sm text-[#a6e3a1]">{topic.passRate}% pass</span>
                    </div>
                    <div className="w-full bg-[#45475a] rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${topic.passRate}%`,
                          background: topic.passRate >= 80 ? '#a6e3a1' : topic.passRate >= 50 ? '#f9e2af' : '#f38ba8'
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-[#6c7086] mt-1">
                      <span>{topic.attempts} attempts</span>
                      <span>Avg: {topic.avgScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#6c7086] text-center py-8">No topic data yet</p>
            )}
          </div>

          {/* Difficulty Breakdown */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#f9e2af]" />
              Performance by Difficulty
            </h2>
            {difficultyBreakdown && difficultyBreakdown.length > 0 ? (
              <div className="space-y-4">
                {difficultyBreakdown.map((diff, idx) => {
                  const diffColors = {
                    easy: '#89b4fa',
                    medium: '#f9e2af',
                    hard: '#f38ba8'
                  };
                  return (
                    <div key={idx} className="bg-[#1e1e2e] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium capitalize"
                          style={{ backgroundColor: `${diffColors[diff.difficulty]}20`, color: diffColors[diff.difficulty] }}
                        >
                          {diff.difficulty}
                        </span>
                        <span className="text-lg font-bold text-[#cdd6f4]">{diff.passRate}%</span>
                      </div>
                      <div className="w-full bg-[#45475a] rounded-full h-2 mb-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${diff.passRate}%`, backgroundColor: diffColors[diff.difficulty] }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[#6c7086]">
                        <span>{diff.attempts} attempts</span>
                        <span>Avg Score: {diff.avgScore}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#6c7086] text-center py-8">No difficulty data yet</p>
            )}
          </div>
        </div>

        {/* Recent Submissions Table */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
          <h2 className="text-lg font-bold text-[#cdd6f4] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#89b4fa]" />
            Recent Submissions
          </h2>
          {recentSubmissions && recentSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-[#6c7086] border-b border-[#45475a]">
                    <th className="pb-3">Student</th>
                    <th className="pb-3">Activity</th>
                    <th className="pb-3">Score</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Attempt</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#45475a]">
                  {recentSubmissions.map((sub) => (
                    <tr key={sub._id} className="text-sm">
                      <td className="py-3">
                        <p className="text-[#cdd6f4]">{sub.studentName}</p>
                        <p className="text-xs text-[#6c7086]">{sub.studentId}</p>
                      </td>
                      <td className="py-3 text-[#bac2de]">{sub.activityTitle}</td>
                      <td className="py-3">
                        <span className={`font-medium ${sub.score >= 80 ? 'text-[#a6e3a1]' : sub.score >= 50 ? 'text-[#f9e2af]' : 'text-[#f38ba8]'}`}>
                          {sub.score}%
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sub.status === 'passed'
                            ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                            : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#6c7086]">#{sub.attemptNumber}</td>
                      <td className="py-3 text-[#6c7086]">
                        {new Date(sub.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[#6c7086] text-center py-8">No submissions yet</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, subValue, color }) {
  return (
    <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-[#cdd6f4]">{value}</p>
      <p className="text-xs text-[#6c7086]">{label}</p>
      {subValue && <p className="text-xs text-[#bac2de] mt-1">{subValue}</p>}
    </div>
  );
}

export default AnalyticsDashboard;
