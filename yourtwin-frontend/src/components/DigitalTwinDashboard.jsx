/**
 * DIGITAL TWIN DASHBOARD
 *
 * This dashboard displays the student's MIRROR TWIN profile - an exact replica
 * of their learning data, behavioral patterns, and cognitive profile.
 *
 * DIGITAL TWIN ARCHITECTURE:
 * - MIRROR TWIN: Displayed in this dashboard. Contains proficiency data,
 *   learning velocity, behavioral patterns, strengths/weaknesses, and
 *   AI dependency metrics. Used to determine personalized learning paths.
 *
 * - SHADOW TWIN: Shown as "Shadow Twin Personality" in the header. This is
 *   the cognitive opposite of the student - where they have weaknesses,
 *   the Shadow Twin has strengths. Powers the 5-level hint system.
 *
 * The dashboard shows:
 * - Learning velocity and trends (from Mirror Twin)
 * - Skill proficiency radar chart
 * - Difficulty progress tracking
 * - Behavioral profile (typing speed, coding style, etc.)
 * - Strengths and areas to improve
 * - Personalized recommendations based on Mirror Twin analysis
 * - Shadow Twin personality summary
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Zap,
  Clock,
  Award,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Activity,
  User,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { twinAPI } from '../services/api';

function DigitalTwinDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [velocityHistory, setVelocityHistory] = useState([]);
  const [shadowPersonality, setShadowPersonality] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profileRes, recsRes, velocityRes, personalityRes] = await Promise.all([
        twinAPI.getProfile(),
        twinAPI.getRecommendations().catch(() => ({ data: { data: [] } })),
        twinAPI.getVelocityHistory().catch(() => ({ data: { data: { history: [] } } })),
        twinAPI.getShadowPersonality().catch(() => ({ data: { data: null } }))
      ]);

      setProfile(profileRes.data.data);
      setRecommendations(recsRes.data.data || []);
      setVelocityHistory(velocityRes.data.data?.history || []);
      setShadowPersonality(personalityRes.data.data);
    } catch (err) {
      console.error('Failed to load twin data:', err);
      setError('Failed to load your Mirror Twin profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-[#89b4fa]" />
        <span className="ml-3 text-[#cdd6f4]">Loading your Mirror Twin profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#45475a]/30 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-[#fab387] mx-auto mb-3" />
        <p className="text-[#cdd6f4]">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-[#89b4fa] text-[#1e1e2e] rounded-lg hover:bg-[#b4befe] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-[#45475a]/30 rounded-lg p-6 text-center">
        <Brain className="w-12 h-12 text-[#6c7086] mx-auto mb-3" />
        <p className="text-[#cdd6f4]">No Mirror Twin data available yet.</p>
        <p className="text-[#6c7086] text-sm mt-2">Complete some activities to build your profile!</p>
      </div>
    );
  }

  // Prepare chart data
  const competencyData = profile.competencies?.map(c => ({
    topic: c.topic.length > 10 ? c.topic.slice(0, 10) + '...' : c.topic,
    fullTopic: c.topic,
    proficiency: c.proficiency,
    successRate: c.successRate
  })) || [];

  const velocityChartData = velocityHistory.slice(-10).map((v, i) => ({
    index: i + 1,
    velocity: v.velocity,
    date: new Date(v.date).toLocaleDateString()
  }));

  const difficultyData = [
    {
      name: 'Easy',
      attempted: profile.difficultyProgress?.easy?.attempted || 0,
      completed: profile.difficultyProgress?.easy?.completed || 0,
      color: '#a6e3a1'
    },
    {
      name: 'Medium',
      attempted: profile.difficultyProgress?.medium?.attempted || 0,
      completed: profile.difficultyProgress?.medium?.completed || 0,
      color: '#f9e2af'
    },
    {
      name: 'Hard',
      attempted: profile.difficultyProgress?.hard?.attempted || 0,
      completed: profile.difficultyProgress?.hard?.completed || 0,
      color: '#f38ba8'
    }
  ];

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-[#a6e3a1]" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-[#f38ba8]" />;
    return <Minus className="w-4 h-4 text-[#6c7086]" />;
  };

  const getDependencyColor = (score) => {
    if (score < 30) return 'text-[#a6e3a1]';
    if (score < 60) return 'text-[#f9e2af]';
    return 'text-[#fab387]';
  };

  const getPhaseColor = (phase) => {
    const colors = {
      beginner: 'bg-[#89b4fa]',
      developing: 'bg-[#94e2d5]',
      intermediate: 'bg-[#a6e3a1]',
      advanced: 'bg-[#f9e2af]'
    };
    return colors[phase] || 'bg-[#6c7086]';
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#89b4fa]/20 to-[#cba6f7]/20 rounded-xl p-6 border border-[#45475a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-2 hover:bg-[#313244] rounded-lg transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
            </button>
            <div className="p-3 bg-[#89b4fa]/20 rounded-xl">
              <Brain className="w-8 h-8 text-[#89b4fa]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#cdd6f4]">Your Mirror Twin Profile</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPhaseColor(profile.learningPhase)} text-[#1e1e2e]`}>
                  {profile.learningPhase?.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-[#6c7086] text-sm">
                  Learning Velocity: {profile.learningVelocity}
                </span>
                {getTrendIcon(profile.velocityTrend)}
              </div>
            </div>
          </div>

          {shadowPersonality && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-[#cba6f7]">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Shadow Twin</span>
              </div>
              <p className="text-[#6c7086] text-sm">{shadowPersonality.personality?.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#313244] rounded-lg p-4 border border-[#45475a]">
          <div className="flex items-center justify-between">
            <Target className="w-5 h-5 text-[#89b4fa]" />
            <span className="text-2xl font-bold text-[#cdd6f4]">{profile.avgProficiency}%</span>
          </div>
          <p className="text-[#6c7086] text-sm mt-1">Avg Proficiency</p>
        </div>

        <div className="bg-[#313244] rounded-lg p-4 border border-[#45475a]">
          <div className="flex items-center justify-between">
            <Award className="w-5 h-5 text-[#a6e3a1]" />
            <span className="text-2xl font-bold text-[#cdd6f4]">{profile.overallSuccessRate}%</span>
          </div>
          <p className="text-[#6c7086] text-sm mt-1">Success Rate</p>
        </div>

        <div className="bg-[#313244] rounded-lg p-4 border border-[#45475a]">
          <div className="flex items-center justify-between">
            <Lightbulb className="w-5 h-5 text-[#f9e2af]" />
            <span className={`text-2xl font-bold ${getDependencyColor(profile.aiDependency?.score)}`}>
              {profile.aiDependency?.score || 0}%
            </span>
          </div>
          <p className="text-[#6c7086] text-sm mt-1">AI Dependency</p>
        </div>

        <div className="bg-[#313244] rounded-lg p-4 border border-[#45475a]">
          <div className="flex items-center justify-between">
            <Activity className="w-5 h-5 text-[#cba6f7]" />
            <span className="text-2xl font-bold text-[#cdd6f4]">
              {profile.totalActivities?.completed}/{profile.totalActivities?.attempted}
            </span>
          </div>
          <p className="text-[#6c7086] text-sm mt-1">Activities</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Radar */}
        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#cdd6f4] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#89b4fa]" />
            Skill Proficiency
          </h3>
          {competencyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={competencyData}>
                <PolarGrid stroke="#45475a" />
                <PolarAngleAxis
                  dataKey="topic"
                  tick={{ fill: '#a6adc8', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: '#6c7086', fontSize: 10 }}
                />
                <Radar
                  name="Proficiency"
                  dataKey="proficiency"
                  stroke="#89b4fa"
                  fill="#89b4fa"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Success Rate"
                  dataKey="successRate"
                  stroke="#a6e3a1"
                  fill="#a6e3a1"
                  fillOpacity={0.3}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2e',
                    border: '1px solid #45475a',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#cdd6f4' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-[#6c7086]">
              Complete activities to see your skill profile
            </div>
          )}
        </div>

        {/* Learning Velocity Chart */}
        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#cdd6f4] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#f9e2af]" />
            Learning Velocity Over Time
          </h3>
          {velocityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={velocityChartData}>
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#89b4fa" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#89b4fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" stroke="#6c7086" fontSize={11} />
                <YAxis stroke="#6c7086" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e2e',
                    border: '1px solid #45475a',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(value, payload) => payload[0]?.payload?.date || ''}
                />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  stroke="#89b4fa"
                  fill="url(#velocityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-[#6c7086]">
              Complete more activities to see velocity trends
            </div>
          )}
        </div>

        {/* Difficulty Progress */}
        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#cdd6f4] mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#a6e3a1]" />
            Progress by Difficulty
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={difficultyData} layout="vertical">
              <XAxis type="number" stroke="#6c7086" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#6c7086" fontSize={12} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e2e',
                  border: '1px solid #45475a',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="completed" name="Completed" stackId="a">
                {difficultyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="attempted" name="Attempted" stackId="b" fill="#45475a" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>

          <div className="flex justify-around mt-4 text-sm">
            {difficultyData.map((d) => (
              <div key={d.name} className="text-center">
                <div className="text-[#cdd6f4] font-medium">{d.name}</div>
                <div className="text-[#6c7086]">
                  {d.completed}/{d.attempted}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Behavioral Profile */}
        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#cdd6f4] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#cba6f7]" />
            Behavioral Profile
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[#a6adc8]">Typing Speed</span>
              <span className="text-[#cdd6f4] font-medium">
                {profile.behavioral?.avgTypingSpeed || 0} CPM
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#a6adc8]">Avg Think Time</span>
              <span className="text-[#cdd6f4] font-medium">
                {profile.behavioral?.avgThinkingPause || 0}s
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#a6adc8]">Active Time</span>
              <span className="text-[#cdd6f4] font-medium">
                {profile.behavioral?.avgActiveTime || 100}%
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#a6adc8]">Coding Style</span>
              <span className="text-[#89b4fa] font-medium capitalize">
                {profile.behavioral?.codingStyle?.replace(/_/g, ' ') || 'Unknown'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[#a6adc8]">Coding Pattern</span>
              <span className="text-[#94e2d5] font-medium capitalize">
                {profile.behavioral?.codingPattern?.replace(/_/g, ' ') || 'Unknown'}
              </span>
            </div>

            <div className="pt-4 border-t border-[#45475a]">
              <div className="flex justify-between items-center">
                <span className="text-[#a6adc8]">AI Independence</span>
                <span className={`font-medium capitalize ${
                  profile.aiDependency?.independence === 'high' ? 'text-[#a6e3a1]' :
                  profile.aiDependency?.independence === 'moderate' ? 'text-[#f9e2af]' :
                  'text-[#fab387]'
                }`}>
                  {profile.aiDependency?.independence || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[#a6adc8]">Hint Effectiveness</span>
                <span className="text-[#cdd6f4] font-medium">
                  {profile.aiDependency?.hintEffectiveness || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#a6e3a1] mb-4">Strengths</h3>
          <div className="flex flex-wrap gap-2">
            {profile.strengths?.length > 0 ? (
              profile.strengths.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-[#a6e3a1]/20 text-[#a6e3a1] rounded-full text-sm"
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-[#6c7086]">Keep practicing to discover your strengths!</span>
            )}
          </div>
        </div>

        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#fab387] mb-4">Areas to Improve</h3>
          <div className="flex flex-wrap gap-2">
            {profile.weaknesses?.length > 0 ? (
              profile.weaknesses.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-[#fab387]/20 text-[#fab387] rounded-full text-sm"
                >
                  {w}
                </span>
              ))
            ) : (
              <span className="text-[#6c7086]">Great job - no major weaknesses detected!</span>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-[#313244] rounded-xl p-6 border border-[#45475a]">
          <h3 className="text-lg font-semibold text-[#cdd6f4] mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#f9e2af]" />
            Personalized Recommendations
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  rec.priority === 'high'
                    ? 'border-[#f38ba8] bg-[#f38ba8]/10'
                    : rec.priority === 'medium'
                    ? 'border-[#f9e2af] bg-[#f9e2af]/10'
                    : 'border-[#45475a] bg-[#45475a]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <ChevronRight className={`w-5 h-5 mt-0.5 ${
                    rec.priority === 'high' ? 'text-[#f38ba8]' :
                    rec.priority === 'medium' ? 'text-[#f9e2af]' :
                    'text-[#6c7086]'
                  }`} />
                  <div>
                    <h4 className="font-medium text-[#cdd6f4]">{rec.title}</h4>
                    <p className="text-[#a6adc8] text-sm mt-1">{rec.description}</p>
                    {rec.actionItems && (
                      <ul className="mt-2 space-y-1">
                        {rec.actionItems.map((item, j) => (
                          <li key={j} className="text-[#6c7086] text-sm flex items-center gap-2">
                            <span className="w-1 h-1 bg-[#6c7086] rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {rec.topics && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.topics.map((topic, j) => (
                          <span
                            key={j}
                            className="px-2 py-0.5 bg-[#45475a] text-[#cdd6f4] rounded text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalTwinDashboard;
