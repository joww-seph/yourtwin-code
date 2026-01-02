import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI, submissionAPI, studentAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Code,
  Flame,
  BarChart3,
  Brain,
  Keyboard,
  Target,
  TrendingUp,
  Zap,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

function MyProgress() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  // Listen for real-time submission updates
  useEffect(() => {
    if (socket) {
      const handleSubmissionResult = () => {
        fetchProgress();
      };

      socket.on('my-submission-result', handleSubmissionResult);

      return () => {
        socket.off('my-submission-result');
      };
    }
  }, [socket]);

  const fetchProgress = async () => {
    try {
      const [sessionsRes, submissionsRes, statsRes, profileRes] = await Promise.all([
        labSessionAPI.getAll(),
        submissionAPI.getAll(),
        submissionAPI.getStats(),
        studentAPI.getMyProfile().catch(() => ({ data: { data: null } }))
      ]);
      setSessions(sessionsRes.data.data);
      setSubmissions(submissionsRes.data.data || []);
      setStats(statsRes.data.data);
      setProfileData(profileRes.data.data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
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

  const getCompletedActivitiesForSession = (session) => {
    if (!session || !session.activities) return 0;
    const sessionActivityIds = (session.activities || []).filter(a => a != null).map(a => a._id || a);
    return sessionActivityIds.filter(activityId => {
      return (submissions || []).some(sub => {
        if (!sub || !sub.activityId) return false;
        const subActivityId = typeof sub.activityId === 'object' ? sub.activityId?._id : sub.activityId;
        return subActivityId === activityId && sub.status === 'passed';
      });
    }).length;
  };

  const competencyData = (profileData?.competencies || []).slice(0, 6).map(c => ({
    topic: c.topic.length > 10 ? c.topic.substring(0, 10) + '..' : c.topic,
    fullTopic: c.topic,
    proficiency: c.proficiencyLevel,
    successRate: c.successRate
  }));

  const topicBarData = (stats?.topicPerformance || []).slice(0, 6).map(t => ({
    name: t.topic.length > 8 ? t.topic.substring(0, 8) + '..' : t.topic,
    fullName: t.topic,
    passRate: t.passRate,
    avgScore: t.avgScore
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#181825] border border-[#313244] rounded-lg p-2 text-xs shadow-lg">
          <p className="text-[#cdd6f4] font-medium mb-1">{payload[0]?.payload?.fullTopic || payload[0]?.payload?.fullName}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>{entry.name}: {entry.value}%</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-2 hover:bg-[#313244] rounded-lg transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
            </button>
            <h1 className="text-2xl font-bold text-[#cdd6f4]">My Progress</h1>
          </div>
          <button
            onClick={() => navigate('/student/twin')}
            className="flex items-center gap-2 text-sm text-[#cba6f7] hover:text-[#f5c2e7]"
          >
            <Brain className="w-4 h-4" /> View Digital Twin
          </button>
        </div>

        {/* Compact Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Code} label="Submissions" value={stats?.overview?.totalSubmissions || 0} color="blue" />
          <StatCard
            icon={CheckCircle}
            label="Passed"
            value={`${stats?.overview?.passedActivities || 0}/${stats?.overview?.totalActivities || 0}`}
            color="green"
            progress={stats?.overview?.passRate}
          />
          <StatCard icon={BarChart3} label="Avg Score" value={`${stats?.overview?.avgScore || 0}%`} color="yellow" />
          <StatCard icon={Flame} label="Streak" value={`${stats?.streakData?.currentStreak || 0}d`} color="orange" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Charts Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Skill + Topic Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Competency Radar */}
              {competencyData.length > 0 && (
                <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-[#cdd6f4] mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#cba6f7]" /> Skills
                  </h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={competencyData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="#313244" />
                        <PolarAngleAxis dataKey="topic" tick={{ fill: '#6c7086', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#45475a', fontSize: 8 }} />
                        <Radar name="Proficiency" dataKey="proficiency" stroke="#89b4fa" fill="#89b4fa" fillOpacity={0.4} />
                        <Radar name="Success" dataKey="successRate" stroke="#a6e3a1" fill="#a6e3a1" fillOpacity={0.3} />
                        <Tooltip content={<CustomTooltip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Topic Performance */}
              {topicBarData.length > 0 && (
                <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-[#cdd6f4] mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#f9e2af]" /> Topics
                  </h2>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicBarData} margin={{ top: 10, right: 10, left: -20, bottom: 30 }}>
                        <XAxis dataKey="name" tick={{ fill: '#6c7086', fontSize: 9 }} angle={-45} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: '#45475a', fontSize: 8 }} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="passRate" name="Pass %" radius={[3, 3, 0, 0]}>
                          {topicBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.passRate >= 80 ? '#a6e3a1' : entry.passRate >= 50 ? '#f9e2af' : '#f38ba8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Activity */}
            {stats?.weeklyActivity && stats.weeklyActivity.length > 0 && (
              <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                <h2 className="text-sm font-semibold text-[#cdd6f4] mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#89b4fa]" /> This Week
                </h2>
                <div className="flex items-end justify-between gap-1 h-20">
                  {stats.weeklyActivity.map((day, idx) => {
                    const maxSub = Math.max(...stats.weeklyActivity.map(d => d.submissions), 1);
                    const height = (day.submissions / maxSub) * 100;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full max-w-[28px] rounded-t transition-all"
                          style={{
                            height: `${Math.max(height, 4)}%`,
                            background: day.passed > 0 ? 'linear-gradient(to top, #a6e3a1, #89b4fa)' : day.submissions > 0 ? '#89b4fa' : '#313244'
                          }}
                          title={`${day.submissions} submissions`}
                        />
                        <span className="text-[10px] text-[#6c7086]">{day.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sessions List */}
            <div className="bg-[#181825] border border-[#313244] rounded-lg">
              <div className="px-4 py-3 border-b border-[#313244]">
                <h2 className="text-sm font-semibold text-[#cdd6f4]">Lab Sessions</h2>
              </div>
              <div className="divide-y divide-[#313244] max-h-[300px] overflow-y-auto">
                {sessions.length === 0 ? (
                  <p className="p-4 text-center text-sm text-[#6c7086]">No sessions enrolled</p>
                ) : (
                  sessions.map((session) => {
                    const total = session.activities?.length || 0;
                    const done = getCompletedActivitiesForSession(session);
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <button
                        key={session._id}
                        onClick={() => navigate(`/student/session/${session._id}`)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#313244]/50 transition text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-[#cdd6f4] truncate">{session.title}</h3>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${session.isActive ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' : 'bg-[#6c7086]/20 text-[#6c7086]'}`}>
                              {session.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-[#313244] rounded-full">
                              <div className="h-1.5 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-[#6c7086]">{done}/{total}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#6c7086]" />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Twin & Recent */}
          <div className="space-y-4">
            {/* Digital Twin Insights */}
            {profileData?.twin && (
              <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                <h2 className="text-sm font-semibold text-[#cdd6f4] mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#cba6f7]" /> Learning Profile
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat icon={Keyboard} label="Typing" value={`${profileData.twin.behavioralData?.avgTypingSpeed || 0} CPM`} />
                  <MiniStat icon={Clock} label="Avg Time" value={`${profileData.twin.averageTimePerProblem || 0}m`} />
                  <MiniStat icon={Zap} label="AI Depend." value={`${Math.round((profileData.twin.behavioralData?.aiDependencyScore || 0) * 100)}%`} />
                  <MiniStat icon={TrendingUp} label="Done" value={`${profileData.twin.totalActivitiesCompleted || 0}`} />
                </div>
                {(profileData.twin.strengths?.length > 0 || profileData.twin.weaknesses?.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-[#313244] grid grid-cols-2 gap-2">
                    {profileData.twin.strengths?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#a6e3a1] mb-1">Strengths</p>
                        <div className="flex flex-wrap gap-1">
                          {profileData.twin.strengths.slice(0, 2).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-[#a6e3a1]/20 text-[#a6e3a1] text-[10px] rounded">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {profileData.twin.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-[#f38ba8] mb-1">Needs Work</p>
                        <div className="flex flex-wrap gap-1">
                          {profileData.twin.weaknesses.slice(0, 2).map((w, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-[#f38ba8]/20 text-[#f38ba8] text-[10px] rounded">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recent Submissions */}
            {stats?.recentSubmissions && stats.recentSubmissions.length > 0 && (
              <div className="bg-[#181825] border border-[#313244] rounded-lg">
                <div className="px-4 py-3 border-b border-[#313244]">
                  <h2 className="text-sm font-semibold text-[#cdd6f4]">Recent</h2>
                </div>
                <div className="divide-y divide-[#313244] max-h-[300px] overflow-y-auto">
                  {stats.recentSubmissions.slice(0, 6).map((sub) => (
                    <div key={sub._id} className="px-4 py-2 flex items-center gap-3">
                      {sub.status === 'passed' ? (
                        <CheckCircle className="w-4 h-4 text-[#a6e3a1] flex-shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#f38ba8] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#cdd6f4] truncate">{sub.activityTitle}</p>
                        <p className="text-[10px] text-[#6c7086]">#{sub.attemptNumber}</p>
                      </div>
                      <span className={`text-sm font-medium ${sub.status === 'passed' ? 'text-[#a6e3a1]' : 'text-[#f38ba8]'}`}>
                        {sub.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Compact stat card
function StatCard({ icon: Icon, label, value, color, progress }) {
  const colors = {
    blue: 'text-[#89b4fa] bg-[#89b4fa]/10',
    green: 'text-[#a6e3a1] bg-[#a6e3a1]/10',
    yellow: 'text-[#f9e2af] bg-[#f9e2af]/10',
    orange: 'text-[#fab387] bg-[#fab387]/10',
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
      {progress !== undefined && (
        <div className="mt-1 h-1 bg-[#313244] rounded-full">
          <div className="h-1 bg-gradient-to-r from-[#a6e3a1] to-[#89b4fa] rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

// Mini stat for twin profile
function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-[#1e1e2e] rounded-lg p-2">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 text-[#6c7086]" />
        <span className="text-[10px] text-[#6c7086]">{label}</span>
      </div>
      <p className="text-sm font-semibold text-[#cdd6f4]">{value}</p>
    </div>
  );
}

export default MyProgress;
