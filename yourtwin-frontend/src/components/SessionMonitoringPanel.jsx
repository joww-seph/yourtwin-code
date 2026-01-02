import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { monitoringAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import {
  Eye,
  AlertTriangle,
  ArrowLeftRight,
  Clipboard,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  Bot,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';

const FALLBACK_POLLING_INTERVAL = 30000; // Fallback poll every 30s when WebSocket is working

// Helper to format time in human readable format
const formatTimeAway = (milliseconds) => {
  if (!milliseconds || milliseconds <= 0) return '0s';

  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

function SessionMonitoringPanel({ sessionId }) {
  const [students, setStudents] = useState([]);
  const [flaggedStudents, setFlaggedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [activeView, setActiveView] = useState('all'); // 'all' | 'flagged'
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollIntervalRef = useRef(null);

  // Use WebSocket for real-time updates
  const { isConnected, monitoringUpdates, flagAlerts, joinLabSession, leaveLabSession } = useSocket();

  // Join the lab session room for WebSocket updates
  useEffect(() => {
    if (sessionId && isConnected) {
      joinLabSession(sessionId);
    }
    return () => {
      if (sessionId) {
        leaveLabSession(sessionId);
      }
    };
  }, [sessionId, isConnected, joinLabSession, leaveLabSession]);

  // Apply real-time WebSocket updates to students data
  useEffect(() => {
    if (Object.keys(monitoringUpdates).length > 0) {
      setStudents(prevStudents => {
        return prevStudents.map(studentData => {
          const update = monitoringUpdates[studentData.student._id];
          if (update) {
            // Update matching activities with real-time data
            const updatedActivities = studentData.activities.map(act => {
              if (act.activity?._id === update.activityId) {
                return {
                  ...act,
                  tabSwitchCount: update.tabSwitchCount,
                  pasteCount: update.pasteCount,
                  largePasteCount: update.largePasteCount,
                  timeAwayPercentage: update.timeAwayPercentage,
                  totalTimeAway: update.totalTimeAway,
                  integrityScore: update.integrityScore
                };
              }
              return act;
            });

            return {
              ...studentData,
              activities: updatedActivities,
              totalTabSwitches: updatedActivities.reduce((sum, a) => sum + a.tabSwitchCount, 0),
              totalPastes: updatedActivities.reduce((sum, a) => sum + a.pasteCount, 0),
              totalLargePastes: updatedActivities.reduce((sum, a) => sum + a.largePasteCount, 0)
            };
          }
          return studentData;
        });
      });
      setLastUpdated(new Date());
    }
  }, [monitoringUpdates]);

  // Initial fetch and setup fallback polling (less frequent when WebSocket is connected)
  useEffect(() => {
    fetchMonitoringData();

    // Fallback polling - less frequent when WebSocket is working
    pollIntervalRef.current = setInterval(() => {
      fetchMonitoringData(true); // silent refresh
    }, isConnected ? FALLBACK_POLLING_INTERVAL : 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [sessionId, isConnected]);

  const fetchMonitoringData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [sessionRes, flaggedRes] = await Promise.all([
        monitoringAPI.getSessionMonitoring(sessionId),
        monitoringAPI.getFlaggedStudents(sessionId)
      ]);

      if (sessionRes.data.success) {
        setStudents(sessionRes.data.students || []);
      }
      if (flaggedRes.data.success) {
        setFlaggedStudents(flaggedRes.data.flaggedStudents || []);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-[#f38ba8] bg-[#f38ba8]/10 border-[#f38ba8]/30';
      case 'medium': return 'text-[#f9e2af] bg-[#f9e2af]/10 border-[#f9e2af]/30';
      default: return 'text-[#89b4fa] bg-[#89b4fa]/10 border-[#89b4fa]/30';
    }
  };

  const getFlagIcon = (type) => {
    switch (type) {
      case 'excessive_tab_switches': return <ArrowLeftRight className="w-3 h-3" />;
      case 'large_paste': return <Clipboard className="w-3 h-3" />;
      case 'long_absence': return <Clock className="w-3 h-3" />;
      case 'copy_paste_pattern': return <Clipboard className="w-3 h-3" />;
      case 'blocked_external_paste': return <Shield className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  const displayStudents = activeView === 'flagged'
    ? students.filter(s => s.hasFlags)
    : students;

  return (
    <div className="space-y-4">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#f9e2af]" />
            <h3 className="text-base font-semibold text-[#cdd6f4]">Activity Monitoring</h3>
          </div>
          {/* Realtime indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                isConnected
                  ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]'
                  : 'bg-[#f9e2af]/20 text-[#f9e2af]'
              }`}
              title={isConnected ? 'Real-time updates via WebSocket' : 'Using polling (WebSocket disconnected)'}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span className="w-2 h-2 rounded-full bg-[#a6e3a1] animate-pulse" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Polling
                </>
              )}
            </span>
            <button
              onClick={() => fetchMonitoringData()}
              className="p-1.5 hover:bg-[#313244] rounded transition"
              title="Refresh now"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#6c7086]" />
            </button>
            {lastUpdated && (
              <span className="text-xs text-[#6c7086]">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 bg-[#1e1e2e] p-1 rounded-lg">
          <button
            onClick={() => setActiveView('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition ${
              activeView === 'all'
                ? 'bg-[#313244] text-[#cdd6f4]'
                : 'text-[#6c7086] hover:text-[#cdd6f4]'
            }`}
          >
            All Students ({students.length})
          </button>
          <button
            onClick={() => setActiveView('flagged')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition flex items-center gap-1.5 ${
              activeView === 'flagged'
                ? 'bg-[#f38ba8]/20 text-[#f38ba8]'
                : 'text-[#6c7086] hover:text-[#f38ba8]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Flagged ({flaggedStudents.length})
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon={User}
          label="Monitored"
          value={students.length}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Flagged"
          value={flaggedStudents.length}
          color={flaggedStudents.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Avg Tab Switches"
          value={students.length > 0 ? Math.round(students.reduce((acc, s) => acc + s.totalTabSwitches, 0) / students.length) : 0}
          color="yellow"
        />
        <StatCard
          icon={Clipboard}
          label="Total Pastes"
          value={students.reduce((acc, s) => acc + s.totalPastes, 0)}
          color="purple"
        />
      </div>

      {/* Students List */}
      {displayStudents.length === 0 ? (
        <div className="bg-[#1e1e2e] border border-[#313244] rounded-lg p-8 text-center">
          {activeView === 'flagged' ? (
            <>
              <Shield className="w-8 h-8 text-[#a6e3a1] mx-auto mb-2" />
              <p className="text-sm text-[#a6e3a1]">No flagged activity detected</p>
              <p className="text-xs text-[#6c7086] mt-1">All students are within normal activity patterns</p>
            </>
          ) : (
            <>
              <Activity className="w-8 h-8 text-[#45475a] mx-auto mb-2" />
              <p className="text-sm text-[#6c7086]">No monitoring data yet</p>
              <p className="text-xs text-[#6c7086] mt-1">Data appears when students start activities</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-[#1e1e2e] border border-[#313244] rounded-lg divide-y divide-[#313244] max-h-[400px] overflow-y-auto">
          {displayStudents.map((studentData) => (
            <StudentMonitoringRow
              key={studentData.student._id}
              studentData={studentData}
              isExpanded={expandedStudent === studentData.student._id}
              onToggle={() => setExpandedStudent(
                expandedStudent === studentData.student._id ? null : studentData.student._id
              )}
              getSeverityColor={getSeverityColor}
              getFlagIcon={getFlagIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to get status indicator
const getStatusIndicator = (status) => {
  switch (status) {
    case 'active':
      return { color: 'bg-[#a6e3a1]', label: 'Active', animate: true };
    case 'idle':
      return { color: 'bg-[#f9e2af]', label: 'Idle', animate: false };
    case 'away':
      return { color: 'bg-[#6c7086]', label: 'Away', animate: false };
    default:
      return { color: 'bg-[#45475a]', label: 'Offline', animate: false };
  }
};

function StudentMonitoringRow({ studentData, isExpanded, onToggle, getSeverityColor, getFlagIcon }) {
  const { student, activities, totalTabSwitches, totalPastes, totalLargePastes, hasFlags, status } = studentData;
  const statusIndicator = getStatusIndicator(status);

  // Calculate average integrity score
  const avgIntegrity = activities.length > 0
    ? Math.round(activities.reduce((sum, a) => sum + (a.integrityScore || 100), 0) / activities.length)
    : null;

  // Check if any activities have AI-flagged submissions
  const hasAIFlagged = activities.some(a => a.submissionValidation?.status === 'flagged');
  const hasPendingValidation = activities.some(a => a.submissionValidation?.status === 'pending');

  return (
    <div className="border-b border-[#313244] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#313244]/50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#89b4fa] to-[#cba6f7] flex items-center justify-center text-[#1e1e2e] font-bold text-xs">
              {student.firstName?.[0]}{student.lastName?.[0]}
            </div>
            {/* Status indicator dot */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e1e2e] ${statusIndicator.color} ${statusIndicator.animate ? 'animate-pulse' : ''}`}
              title={statusIndicator.label}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[#cdd6f4]">
                {student.lastName}, {student.firstName}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                status === 'active' ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' :
                status === 'idle' ? 'bg-[#f9e2af]/20 text-[#f9e2af]' :
                status === 'away' ? 'bg-[#6c7086]/20 text-[#6c7086]' :
                'bg-[#45475a]/20 text-[#45475a]'
              }`}>
                {statusIndicator.label}
              </span>
            </div>
            <p className="text-xs text-[#6c7086]">{student.studentId}</p>
          </div>
          {hasFlags && (
            <span className="px-2 py-0.5 text-xs bg-[#f38ba8]/20 text-[#f38ba8] rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Flagged
            </span>
          )}
          {hasAIFlagged && (
            <span className="px-2 py-0.5 text-xs bg-[#f38ba8]/20 text-[#f38ba8] rounded-full flex items-center gap-1 border border-[#f38ba8]/30">
              <Bot className="w-3 h-3" />
              AI Workaround
            </span>
          )}
          {hasPendingValidation && !hasAIFlagged && (
            <span className="px-2 py-0.5 text-xs bg-[#f9e2af]/20 text-[#f9e2af] rounded-full flex items-center gap-1">
              <Bot className="w-3 h-3" />
              <Loader2 className="w-3 h-3 animate-spin" />
            </span>
          )}
          {avgIntegrity !== null && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              avgIntegrity >= 80 ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' :
              avgIntegrity >= 60 ? 'bg-[#f9e2af]/20 text-[#f9e2af]' :
              avgIntegrity >= 40 ? 'bg-[#fab387]/20 text-[#fab387]' :
              'bg-[#f38ba8]/20 text-[#f38ba8]'
            }`}>
              {avgIntegrity}% integrity
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-[#a6adc8]">
            <span className="flex items-center gap-1" title="Tab switches">
              <ArrowLeftRight className="w-3 h-3" />
              {totalTabSwitches}
            </span>
            <span className="flex items-center gap-1" title="Pastes">
              <Clipboard className="w-3 h-3" />
              {totalPastes}
            </span>
            {totalLargePastes > 0 && (
              <span className="flex items-center gap-1 text-[#f9e2af]" title="Large pastes (>50 chars)">
                <AlertTriangle className="w-3 h-3" />
                {totalLargePastes}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#6c7086]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#6c7086]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-[#181825]">
          <p className="text-xs text-[#6c7086] mb-2">Activity Breakdown:</p>
          <div className="space-y-2">
            {activities.map((act, idx) => (
              <div
                key={idx}
                className="bg-[#1e1e2e] rounded p-3 border border-[#313244]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#cdd6f4]">
                    {act.activity?.title || 'Unknown Activity'}
                  </span>
                  {act.flags?.length > 0 && (
                    <span className="text-xs text-[#f38ba8]">
                      {act.flags.length} flag{act.flags.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#a6adc8]">
                  <span>Tab switches: {act.tabSwitchCount}</span>
                  <span>Pastes: {act.pasteCount}</span>
                  <span>Large pastes: {act.largePasteCount}</span>
                  <span title={`${act.timeAwayPercentage}% of session time`}>
                    Time away: {formatTimeAway(act.totalTimeAway)} ({act.timeAwayPercentage}%)
                  </span>
                  {act.integrityScore !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        act.integrityScore >= 80 ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' :
                        act.integrityScore >= 60 ? 'bg-[#f9e2af]/20 text-[#f9e2af]' :
                        act.integrityScore >= 40 ? 'bg-[#fab387]/20 text-[#fab387]' :
                        'bg-[#f38ba8]/20 text-[#f38ba8]'
                      }`}
                      title="Integrity Score - Higher is better (100 = perfect)"
                    >
                      Integrity: {act.integrityScore}%
                    </span>
                  )}
                </div>

                {/* AI Validation Status */}
                {act.submissionValidation && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                      act.submissionValidation.status === 'flagged'
                        ? 'bg-[#f38ba8]/20 text-[#f38ba8] border border-[#f38ba8]/30'
                        : act.submissionValidation.status === 'validated'
                        ? 'bg-[#a6e3a1]/20 text-[#a6e3a1] border border-[#a6e3a1]/30'
                        : 'bg-[#f9e2af]/20 text-[#f9e2af] border border-[#f9e2af]/30'
                    }`}>
                      {act.submissionValidation.status === 'flagged' ? (
                        <>
                          <Bot className="w-3 h-3" />
                          <XCircle className="w-3 h-3" />
                          <span>AI Flagged Workaround</span>
                        </>
                      ) : act.submissionValidation.status === 'validated' ? (
                        <>
                          <Bot className="w-3 h-3" />
                          <CheckCircle2 className="w-3 h-3" />
                          <span>AI Verified</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3 h-3" />
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>AI Validating...</span>
                        </>
                      )}
                    </div>
                    {act.submissionValidation.aiValidation?.confidence && (
                      <span className="text-xs text-[#6c7086]">
                        {act.submissionValidation.aiValidation.confidence}% confidence
                      </span>
                    )}
                  </div>
                )}

                {/* AI Validation Details (if flagged) */}
                {act.submissionValidation?.status === 'flagged' && act.submissionValidation.aiValidation && (
                  <div className="mt-2 p-2 bg-[#f38ba8]/10 border border-[#f38ba8]/20 rounded space-y-2">
                    {/* Quick status indicators */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`flex items-center gap-1 ${
                        act.submissionValidation.aiValidation.followsInstructions === false
                          ? 'text-[#f38ba8]'
                          : 'text-[#a6e3a1]'
                      }`}>
                        {act.submissionValidation.aiValidation.followsInstructions === false ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Instructions: {act.submissionValidation.aiValidation.followsInstructions === false ? 'Not Followed' : 'Followed'}
                      </span>
                      <span className={`flex items-center gap-1 ${
                        act.submissionValidation.aiValidation.isHardcoded
                          ? 'text-[#f38ba8]'
                          : 'text-[#a6e3a1]'
                      }`}>
                        {act.submissionValidation.aiValidation.isHardcoded ? (
                          <XCircle className="w-3 h-3" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {act.submissionValidation.aiValidation.isHardcoded ? 'Hardcoded' : 'Real Algorithm'}
                      </span>
                    </div>
                    {/* Issues list */}
                    <div>
                      <p className="text-xs text-[#f38ba8] font-medium mb-1">AI Detected Issues:</p>
                      {act.submissionValidation.aiValidation.issues?.length > 0 ? (
                        <ul className="text-xs text-[#a6adc8] list-disc list-inside">
                          {act.submissionValidation.aiValidation.issues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#a6adc8]">{act.submissionValidation.aiValidation.explanation}</p>
                      )}
                    </div>
                    {/* Model info */}
                    {act.submissionValidation.aiValidation.model && (
                      <p className="text-[10px] text-[#6c7086]">
                        Validated by: {act.submissionValidation.aiValidation.model} in {act.submissionValidation.aiValidation.responseTime}ms
                      </p>
                    )}
                  </div>
                )}

                {act.flags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {act.flags.map((flag, fidx) => (
                      <span
                        key={fidx}
                        className={`px-2 py-1 text-xs rounded border flex items-center gap-1 ${getSeverityColor(flag.severity)}`}
                      >
                        {getFlagIcon(flag.type)}
                        {flag.description}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'text-[#89b4fa] bg-[#89b4fa]/10',
    green: 'text-[#a6e3a1] bg-[#a6e3a1]/10',
    yellow: 'text-[#f9e2af] bg-[#f9e2af]/10',
    red: 'text-[#f38ba8] bg-[#f38ba8]/10',
    purple: 'text-[#cba6f7] bg-[#cba6f7]/10'
  };

  return (
    <div className="bg-[#1e1e2e] border border-[#313244] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-[#6c7086]">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#cdd6f4]">{value}</p>
    </div>
  );
}

export default SessionMonitoringPanel;
