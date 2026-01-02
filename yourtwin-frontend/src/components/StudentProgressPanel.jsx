import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Bot,
  FileCode,
  BarChart3,
  Target,
  Loader2,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { labSessionAPI } from '../services/api';
import { showSuccess, showError } from '../utils/sweetalert';

// Status badge component
function StatusBadge({ status }) {
  const statusConfig = {
    passed: { color: '#a6e3a1', bg: 'rgba(166, 227, 161, 0.15)', label: 'Passed' },
    failed: { color: '#f38ba8', bg: 'rgba(243, 139, 168, 0.15)', label: 'Failed' },
    error: { color: '#fab387', bg: 'rgba(250, 179, 135, 0.15)', label: 'Error' },
    pending: { color: '#f9e2af', bg: 'rgba(249, 226, 175, 0.15)', label: 'Pending' },
    running: { color: '#89b4fa', bg: 'rgba(137, 180, 250, 0.15)', label: 'Running' },
    resubmission_required: { color: '#fab387', bg: 'rgba(250, 179, 135, 0.15)', label: 'Resubmit' },
    not_started: { color: '#6c7086', bg: 'rgba(108, 112, 134, 0.15)', label: 'Not Started' }
  };

  const config = statusConfig[status] || statusConfig.not_started;

  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

// Progress bar component
function ProgressBar({ value, max = 100, color = '#89b4fa', size = 'md' }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className={`w-full bg-[#45475a] rounded-full ${height} overflow-hidden`}>
      <div
        className={`${height} rounded-full transition-all duration-500`}
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

// Stat card component
function StatCard({ icon: Icon, label, value, subValue, color = '#89b4fa' }) {
  return (
    <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#cdd6f4]">{value}</p>
          <p className="text-xs text-[#6c7086]">{label}</p>
          {subValue && <p className="text-xs text-[#9399b2]">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

// Student row component (expandable)
function StudentRow({ student, activities, sessionId, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [allowingResubmission, setAllowingResubmission] = useState(null);
  const { progress } = student;

  const handleAllowResubmission = async (activityId, e) => {
    e.stopPropagation();
    setAllowingResubmission(activityId);
    try {
      await labSessionAPI.allowResubmission(sessionId, student.student._id, activityId);
      showSuccess('Resubmission allowed! Student can now submit again.');
      if (onRefresh) onRefresh();
    } catch (error) {
      showError('Failed to allow resubmission', error.response?.data?.message || 'Please try again.');
    } finally {
      setAllowingResubmission(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#a6e3a1';
    if (score >= 60) return '#f9e2af';
    if (score >= 40) return '#fab387';
    return '#f38ba8';
  };

  return (
    <div className="border-b border-[#45475a] last:border-b-0">
      {/* Main row */}
      <div
        className="flex items-center gap-4 px-4 py-3 hover:bg-[#313244] cursor-pointer transition"
        onClick={() => setExpanded(!expanded)}
      >
        <button className="p-1">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#6c7086]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#6c7086]" />
          )}
        </button>

        {/* Student info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[#cdd6f4] truncate">
            {student.student.lastName}, {student.student.firstName}{student.student.middleName ? ` ${student.student.middleName.charAt(0)}.` : ''}
          </p>
          <p className="text-xs text-[#6c7086]">{student.student.studentId}</p>
        </div>

        {/* Progress */}
        <div className="w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#9399b2]">Progress</span>
            <span className="text-xs font-medium text-[#cdd6f4]">
              {progress.completedActivities}/{progress.totalActivities}
            </span>
          </div>
          <ProgressBar
            value={progress.completionRate}
            color={progress.completionRate === 100 ? '#a6e3a1' : '#89b4fa'}
            size="sm"
          />
        </div>

        {/* Avg Score */}
        <div className="w-20 text-center">
          <p
            className="text-lg font-bold"
            style={{ color: getScoreColor(progress.avgScore) }}
          >
            {progress.avgScore}%
          </p>
          <p className="text-xs text-[#6c7086]">Avg Score</p>
        </div>

        {/* Attempts */}
        <div className="w-16 text-center">
          <p className="text-sm font-medium text-[#cdd6f4]">{progress.totalAttempts}</p>
          <p className="text-xs text-[#6c7086]">Attempts</p>
        </div>

        {/* Hints */}
        <div className="w-16 text-center">
          <p className="text-sm font-medium text-[#cba6f7]">{progress.totalHints}</p>
          <p className="text-xs text-[#6c7086]">Hints</p>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="bg-[#1e1e2e] px-4 py-3 border-t border-[#45475a]">
          <p className="text-xs text-[#6c7086] mb-2">Activity Breakdown:</p>
          <div className="grid gap-2">
            {student.activities.map((activity) => (
              <div
                key={activity.activityId}
                className="flex items-center gap-3 p-2 bg-[#313244] rounded-lg text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[#cdd6f4] truncate">{activity.activityTitle}</p>
                </div>
                <StatusBadge status={activity.status} />
                <span
                  className="font-medium w-12 text-right"
                  style={{ color: getScoreColor(activity.bestScore) }}
                >
                  {activity.bestScore}%
                </span>
                <span className="text-[#6c7086] w-16 text-right">
                  {activity.attempts} tries
                </span>
                <span className="text-[#cba6f7] w-12 text-right">
                  {activity.hintsUsed} hints
                </span>
                {/* Allow Resubmission button - only show for passed activities */}
                {activity.status === 'passed' && (
                  <button
                    onClick={(e) => handleAllowResubmission(activity.activityId, e)}
                    disabled={allowingResubmission === activity.activityId}
                    className="flex items-center gap-1 px-2 py-1 bg-[#fab387]/20 hover:bg-[#fab387]/30 text-[#fab387] rounded text-xs transition disabled:opacity-50"
                    title="Allow student to resubmit this activity"
                  >
                    {allowingResubmission === activity.activityId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Resubmit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main StudentProgressPanel component
function StudentProgressPanel({ sessionId, onActivitySelect }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityProgress, setActivityProgress] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name, score, progress, attempts
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (sessionId) {
      fetchProgress();
    }
  }, [sessionId]);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await labSessionAPI.getSessionProgress(sessionId);
      setProgressData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
      setError(err.response?.data?.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityProgress = async (activityId) => {
    setActivityLoading(true);
    try {
      const response = await labSessionAPI.getActivityProgress(sessionId, activityId);
      setActivityProgress(response.data.data);
    } catch (err) {
      console.error('Failed to fetch activity progress:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    fetchActivityProgress(activity._id);
    if (onActivitySelect) {
      onActivitySelect(activity);
    }
  };

  const getSortedStudents = () => {
    if (!progressData?.students) return [];

    return [...progressData.students].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = `${a.student.lastName} ${a.student.firstName}`.localeCompare(
            `${b.student.lastName} ${b.student.firstName}`
          );
          break;
        case 'score':
          comparison = a.progress.avgScore - b.progress.avgScore;
          break;
        case 'progress':
          comparison = a.progress.completionRate - b.progress.completionRate;
          break;
        case 'attempts':
          comparison = a.progress.totalAttempts - b.progress.totalAttempts;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-[#89b4fa] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-[#f38ba8] mx-auto mb-4" />
        <p className="text-[#f38ba8] mb-4">{error}</p>
        <button
          onClick={fetchProgress}
          className="px-4 py-2 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded-lg transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!progressData) return null;

  const { stats, students, activities } = progressData;

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#cdd6f4] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#89b4fa]" />
          Student Progress
        </h3>
        <button
          onClick={fetchProgress}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          color="#89b4fa"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Completion"
          value={`${stats.avgCompletionRate}%`}
          subValue={`${stats.studentsCompleted} completed all`}
          color="#a6e3a1"
        />
        <StatCard
          icon={FileCode}
          label="Total Submissions"
          value={stats.totalSubmissions}
          color="#f9e2af"
        />
        <StatCard
          icon={Bot}
          label="Hints Used"
          value={stats.totalHintsUsed}
          color="#cba6f7"
        />
      </div>

      {/* Activity Quick View */}
      <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[#cdd6f4] mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#89b4fa]" />
          Activities Overview
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activities.map((activity) => {
            const studentData = students.map(s =>
              s.activities.find(a => a.activityId === activity._id)
            ).filter(Boolean);
            const passedCount = studentData.filter(a => a.passed).length;
            const attemptedCount = studentData.filter(a => a.attempts > 0).length;

            return (
              <button
                key={activity._id}
                onClick={() => handleActivityClick(activity)}
                className={`p-3 rounded-lg border text-left transition ${
                  selectedActivity?._id === activity._id
                    ? 'border-[#89b4fa] bg-[#89b4fa]/10'
                    : 'border-[#45475a] hover:border-[#585b70] bg-[#1e1e2e]'
                }`}
              >
                <p className="text-sm font-medium text-[#cdd6f4] truncate mb-1">
                  {activity.title}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#a6e3a1]">{passedCount} passed</span>
                  <span className="text-[#6c7086]">/ {attemptedCount} tried</span>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={passedCount}
                    max={stats.totalStudents}
                    color="#a6e3a1"
                    size="sm"
                  />
                </div>
                {activity.aiAssistanceLevel === 0 && (
                  <span className="inline-block mt-2 px-1.5 py-0.5 text-xs bg-[#f38ba8]/20 text-[#f38ba8] rounded">
                    Lockdown
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Student List */}
      <div className="bg-[#313244] border border-[#45475a] rounded-lg overflow-hidden">
        {/* Sort controls */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-[#45475a] bg-[#1e1e2e]">
          <span className="text-xs text-[#6c7086]">Sort by:</span>
          {['name', 'score', 'progress', 'attempts'].map((option) => (
            <button
              key={option}
              onClick={() => {
                if (sortBy === option) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(option);
                  setSortOrder('asc');
                }
              }}
              className={`px-2 py-1 text-xs rounded transition ${
                sortBy === option
                  ? 'bg-[#89b4fa] text-[#1e1e2e]'
                  : 'text-[#9399b2] hover:text-[#cdd6f4]'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
              {sortBy === option && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>

        {/* Student rows */}
        <div className="max-h-[500px] overflow-y-auto">
          {getSortedStudents().length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-[#6c7086] mx-auto mb-4" />
              <p className="text-[#6c7086]">No students enrolled</p>
            </div>
          ) : (
            getSortedStudents().map((student) => (
              <StudentRow
                key={student.student._id}
                student={student}
                activities={activities}
                sessionId={sessionId}
                onRefresh={fetchProgress}
              />
            ))
          )}
        </div>
      </div>

      {/* Activity Detail Modal/Panel */}
      {selectedActivity && activityProgress && !activityLoading && (
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-[#cdd6f4]">
              {activityProgress.activity.title} - Detailed View
            </h4>
            <button
              onClick={() => {
                setSelectedActivity(null);
                setActivityProgress(null);
              }}
              className="text-xs text-[#6c7086] hover:text-[#cdd6f4]"
            >
              Close
            </button>
          </div>

          {/* Activity stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-[#1e1e2e] rounded-lg">
              <p className="text-xl font-bold text-[#a6e3a1]">
                {activityProgress.stats.passRate}%
              </p>
              <p className="text-xs text-[#6c7086]">Pass Rate</p>
            </div>
            <div className="text-center p-3 bg-[#1e1e2e] rounded-lg">
              <p className="text-xl font-bold text-[#89b4fa]">
                {activityProgress.stats.avgScore}%
              </p>
              <p className="text-xs text-[#6c7086]">Avg Score</p>
            </div>
            <div className="text-center p-3 bg-[#1e1e2e] rounded-lg">
              <p className="text-xl font-bold text-[#f9e2af]">
                {activityProgress.stats.avgAttempts}
              </p>
              <p className="text-xs text-[#6c7086]">Avg Attempts</p>
            </div>
            <div className="text-center p-3 bg-[#1e1e2e] rounded-lg">
              <p className="text-xl font-bold text-[#cba6f7]">
                {activityProgress.stats.totalHints}
              </p>
              <p className="text-xs text-[#6c7086]">Total Hints</p>
            </div>
          </div>

          {/* Student breakdown for this activity */}
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1e1e2e] sticky top-0">
                <tr>
                  <th className="text-left p-2 text-[#6c7086] font-medium">Student</th>
                  <th className="text-center p-2 text-[#6c7086] font-medium">Status</th>
                  <th className="text-center p-2 text-[#6c7086] font-medium">Score</th>
                  <th className="text-center p-2 text-[#6c7086] font-medium">Attempts</th>
                  <th className="text-center p-2 text-[#6c7086] font-medium">Hints</th>
                </tr>
              </thead>
              <tbody>
                {activityProgress.students.map((s) => (
                  <tr key={s.student._id} className="border-t border-[#45475a]">
                    <td className="p-2 text-[#cdd6f4]">
                      {s.student.firstName} {s.student.lastName}
                    </td>
                    <td className="p-2 text-center">
                      <StatusBadge status={s.submissions.status} />
                    </td>
                    <td className="p-2 text-center font-medium" style={{
                      color: s.submissions.bestScore >= 80 ? '#a6e3a1' :
                             s.submissions.bestScore >= 60 ? '#f9e2af' : '#f38ba8'
                    }}>
                      {s.submissions.bestScore}%
                    </td>
                    <td className="p-2 text-center text-[#cdd6f4]">
                      {s.submissions.total}
                    </td>
                    <td className="p-2 text-center text-[#cba6f7]">
                      {s.hints.total}
                      {s.hints.highestLevel > 0 && (
                        <span className="text-xs text-[#6c7086]"> (Lv.{s.hints.highestLevel})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentProgressPanel;
