import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import Layout from '../components/Layout';
import StudentSelector from '../components/StudentSelector';
import CreateActivityModal from '../components/CreateActivityModal';
import StudentProgressPanel from '../components/StudentProgressPanel';
import { labSessionAPI, activityAPI } from '../services/api';
import { showSuccess, showError, showDeleteConfirm } from '../utils/sweetalert';
import {
  Plus,
  Trash2,
  Users,
  BookOpen,
  Clock,
  Settings,
  GripVertical,
  Power,
  PowerOff,
  Calendar,
  MapPin,
  Edit3,
  Copy,
  AlertTriangle,
  BarChart3,
  Shield,
  ArrowLeft,
  Eye
} from 'lucide-react';
import PlagiarismReport from '../components/PlagiarismReport';
import SessionMonitoringPanel from '../components/SessionMonitoringPanel';

function LabSessionDetailPage() {
  const { sessionId } = useParams();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [activities, setActivities] = useState([]);
  const [allowedStudents, setAllowedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activities');
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [draggedActivity, setDraggedActivity] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityModalMode, setActivityModalMode] = useState('create');
  const [deletingSession, setDeletingSession] = useState(false);
  const [plagiarismActivity, setPlagiarismActivity] = useState(null);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  useEffect(() => {
    if (socket) {
      const handleSessionUpdate = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          fetchSessionDetails();
        }
      };
      const handleSessionDeleted = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          showError('Session Deleted', 'This session has been deleted.');
          navigate('/instructor/lab-sessions');
        }
      };
      const handleActivityUpdate = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          fetchSessionDetails();
        }
      };
      const handleSubmissionCreated = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          // Refresh session details to update progress
          fetchSessionDetails();
        }
      };

      // Handle auto-activation/deactivation status changes
      const handleStatusChange = (data) => {
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          fetchSessionDetails();
        }
      };

      socket.on('lab-session-updated', handleSessionUpdate);
      socket.on('lab-session-deleted', handleSessionDeleted);
      socket.on('lab-session-status-change', handleStatusChange); // Auto-activation/deactivation
      socket.on('activity-created', handleActivityUpdate);
      socket.on('activity-updated', handleActivityUpdate);
      socket.on('activity-deleted', handleActivityUpdate);
      socket.on('submission-created', handleSubmissionCreated);

      return () => {
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
        socket.off('lab-session-status-change');
        socket.off('activity-created');
        socket.off('activity-updated');
        socket.off('activity-deleted');
        socket.off('submission-created');
      };
    }
  }, [socket, sessionId, navigate]);

  const fetchSessionDetails = async () => {
    try {
      const response = await labSessionAPI.getOne(sessionId);
      setSession(response.data.data);
      setActivities(response.data.data.activities || []);
      setAllowedStudents(response.data.data.allowedStudents || []);
    } catch (error) {
      console.error('Failed to fetch session details:', error);
      if (error.response?.status === 403) {
        showError('Access Denied', 'You do not have permission to access this session.');
        navigate('/instructor/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudents = async (studentIds) => {
    try {
      const response = await labSessionAPI.addStudents(sessionId, studentIds);
      const { addedCount, message } = response.data.data || {};
      setShowAddStudents(false);
      fetchSessionDetails();
      if (addedCount > 0) {
        showSuccess(message || `${addedCount} student(s) added successfully!`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to add students';
      showError('Failed to Add Students', errorMessage);
      fetchSessionDetails();
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await labSessionAPI.removeStudent(sessionId, studentId);
      fetchSessionDetails();
      showSuccess('Student removed successfully!');
    } catch (error) {
      showError('Failed to remove student', 'Please try again.');
    }
  };

  const handleDeleteActivity = async (activityId) => {
    const result = await showDeleteConfirm('this activity');
    if (result.isConfirmed) {
      try {
        await activityAPI.delete(activityId);
        fetchSessionDetails();
        showSuccess('Activity deleted successfully!');
      } catch (error) {
        showError('Failed to delete activity', 'Please try again.');
      }
    }
  };

  const handleCreateActivity = async (activityData) => {
    setCreatingActivity(true);
    try {
      if (activityModalMode === 'edit' && editingActivity) {
        await activityAPI.update(editingActivity._id, activityData);
        showSuccess('Activity updated successfully!');
      } else {
        await labSessionAPI.createActivity(sessionId, activityData);
        showSuccess(activityModalMode === 'duplicate' ? 'Activity duplicated!' : 'Activity created!');
      }
      setShowActivityForm(false);
      setEditingActivity(null);
      setActivityModalMode('create');
      fetchSessionDetails();
    } catch (error) {
      showError('Failed to save activity', 'Please try again.');
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setActivityModalMode('edit');
    setShowActivityForm(true);
  };

  const handleDuplicateActivity = (activity) => {
    setEditingActivity(activity);
    setActivityModalMode('duplicate');
    setShowActivityForm(true);
  };

  const handleCloseActivityModal = () => {
    setShowActivityForm(false);
    setEditingActivity(null);
    setActivityModalMode('create');
  };

  const handleDeleteSession = async () => {
    const result = await showDeleteConfirm('this lab session');
    if (result.isConfirmed) {
      setDeletingSession(true);
      try {
        await labSessionAPI.delete(sessionId);
        showSuccess('Lab session deleted successfully!');
        navigate('/instructor/dashboard');
      } catch (error) {
        showError('Failed to delete session', 'Please try again.');
      } finally {
        setDeletingSession(false);
      }
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedActivity(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (draggedActivity === null || draggedActivity === dropIndex) {
      setDraggedActivity(null);
      return;
    }
    const newActivities = [...activities];
    const [movedActivity] = newActivities.splice(draggedActivity, 1);
    newActivities.splice(dropIndex, 0, movedActivity);
    setActivities(newActivities);
    setDraggedActivity(null);

    try {
      const updates = newActivities.map((activity, index) => ({
        id: activity._id,
        orderInSession: index + 1
      }));
      for (const update of updates) {
        await activityAPI.update(update.id, { orderInSession: update.orderInSession });
      }
    } catch (error) {
      showError('Failed to update order', 'Please refresh.');
      fetchSessionDetails();
    }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      if (session.isActive) {
        await labSessionAPI.deactivate(sessionId);
        showSuccess('Session deactivated!');
      } else {
        await labSessionAPI.activate(sessionId);
        showSuccess('Session activated!');
      }
      fetchSessionDetails();
    } catch (error) {
      showError('Failed to update status', 'Please try again.');
    } finally {
      setTogglingStatus(false);
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

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-[#f38ba8]">Session not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <button
              onClick={() => navigate('/instructor/lab-sessions')}
              className="p-2 hover:bg-[#313244] rounded-lg transition flex-shrink-0 mt-1"
              title="Back to Lab Sessions"
            >
              <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold text-[#cdd6f4] truncate">{session.title}</h1>
                <span className={`text-sm px-2.5 py-1 rounded-lg font-medium flex-shrink-0 ${
                  session.isActive ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' : 'bg-[#f38ba8]/20 text-[#f38ba8]'
                }`}>
                  {session.isActive ? 'Active' : 'Inactive'}
                </span>
                {session.language && (
                  <span className="text-sm px-2.5 py-1 rounded-lg font-medium flex-shrink-0 bg-[#94e2d5]/20 text-[#94e2d5] uppercase">
                    {session.language === 'cpp' ? 'C++' : session.language}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-[#a6adc8] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> {session.course} {session.yearLevel}-{session.section}
                </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(session.scheduledDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {session.startTime} - {session.endTime}
              </span>
              {session.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {session.room}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/instructor/lab-sessions/${sessionId}/edit`)}
          className="px-4 py-2 text-sm bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-lg flex items-center gap-2 flex-shrink-0"
        >
          <Edit3 className="w-4 h-4" /> Edit Session
        </button>
      </div>

        {/* Compact Tabs */}
        <div className="flex gap-1 border-b border-[#313244]">
          <TabButton active={activeTab === 'activities'} onClick={() => setActiveTab('activities')}>
            <BookOpen className="w-3.5 h-3.5" /> Activities ({activities.length})
          </TabButton>
          <TabButton active={activeTab === 'students'} onClick={() => setActiveTab('students')}>
            <Users className="w-3.5 h-3.5" /> Students ({allowedStudents.length})
          </TabButton>
          <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>
            <BarChart3 className="w-3.5 h-3.5" /> Progress
          </TabButton>
          <TabButton active={activeTab === 'monitoring'} onClick={() => setActiveTab('monitoring')}>
            <Eye className="w-3.5 h-3.5" /> Monitoring
          </TabButton>
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>
            <Settings className="w-3.5 h-3.5" /> Settings
          </TabButton>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6c7086]">Drag to reorder activities</p>
                <button
                  onClick={() => setShowActivityForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] text-sm font-medium rounded-lg"
                >
                  <Plus className="w-4 h-4" /> New Activity
                </button>
              </div>

              <CreateActivityModal
                isOpen={showActivityForm}
                onClose={handleCloseActivityModal}
                onSubmit={handleCreateActivity}
                loading={creatingActivity}
                initialData={editingActivity}
                mode={activityModalMode}
                sessionLanguage={session?.language}
              />

              {activities.length === 0 ? (
                <div className="bg-[#181825] border border-[#313244] rounded-lg p-8 text-center">
                  <BookOpen className="w-8 h-8 text-[#45475a] mx-auto mb-2" />
                  <p className="text-sm text-[#6c7086]">No activities yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity, index) => (
                    <div
                      key={activity._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={() => setDraggedActivity(null)}
                      className={`bg-[#181825] border border-[#313244] rounded-lg p-3 hover:border-[#45475a] transition flex items-center gap-3 group cursor-move ${
                        draggedActivity === index ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="p-1 text-[#45475a] opacity-0 group-hover:opacity-100 transition cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#6c7086] bg-[#313244] px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-[#cdd6f4] truncate">{activity.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {activity.topic && (
                            <span className="text-xs px-1.5 py-0.5 bg-[#313244] text-[#6c7086] rounded">{activity.topic}</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            activity.difficulty === 'easy' ? 'bg-[#a6e3a1]/20 text-[#a6e3a1]' :
                            activity.difficulty === 'medium' ? 'bg-[#f9e2af]/20 text-[#f9e2af]' :
                            'bg-[#f38ba8]/20 text-[#f38ba8]'
                          }`}>{activity.difficulty}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-[#94e2d5]/20 text-[#94e2d5] rounded uppercase">{activity.language}</span>
                          {activity.testCases?.length > 0 && (
                            <span className="text-xs text-[#6c7086]">{activity.testCases.length} tests</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => handleEditActivity(activity)} className="p-1.5 hover:bg-[#313244] text-[#89b4fa] rounded" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDuplicateActivity(activity)} className="p-1.5 hover:bg-[#313244] text-[#a6e3a1] rounded" title="Duplicate">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setPlagiarismActivity(activity)} className="p-1.5 hover:bg-[#313244] text-[#cba6f7] rounded" title="Plagiarism">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteActivity(activity._id)} className="p-1.5 hover:bg-[#313244] text-[#f38ba8] rounded" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {plagiarismActivity && (
            <PlagiarismReport
              activityId={plagiarismActivity._id}
              activityTitle={plagiarismActivity.title}
              onClose={() => setPlagiarismActivity(null)}
            />
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6c7086]">{allowedStudents.length} enrolled students</p>
                <button
                  onClick={() => setShowAddStudents(!showAddStudents)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] text-sm font-medium rounded-lg"
                >
                  <Plus className="w-4 h-4" /> Add Students
                </button>
              </div>

              {showAddStudents && (
                <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                  <StudentSelector
                    onStudentsSelected={handleAddStudents}
                    excludeStudentIds={allowedStudents.map(s => s._id)}
                    maxHeight="400px"
                    sessionInfo={{ course: session.course, yearLevel: session.yearLevel, section: session.section }}
                  />
                  <button
                    onClick={() => setShowAddStudents(false)}
                    className="mt-3 w-full px-3 py-2 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] text-sm rounded-lg"
                  >
                    Done
                  </button>
                </div>
              )}

              {allowedStudents.length === 0 ? (
                <div className="bg-[#181825] border border-[#313244] rounded-lg p-8 text-center">
                  <Users className="w-8 h-8 text-[#45475a] mx-auto mb-2" />
                  <p className="text-sm text-[#6c7086]">No students enrolled</p>
                </div>
              ) : (
                <div className="bg-[#181825] border border-[#313244] rounded-lg divide-y divide-[#313244] max-h-[400px] overflow-y-auto">
                  {[...allowedStudents]
                    .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                    .map((student) => {
                      const middleInitial = student.middleName ? ` ${student.middleName.charAt(0)}.` : '';
                      return (
                        <div key={student._id} className="px-4 py-3 flex items-center justify-between group hover:bg-[#313244]/50">
                          <div>
                            <p className="text-base text-[#cdd6f4]">{student.lastName}, {student.firstName}{middleInitial}</p>
                            <p className="text-sm text-[#6c7086]">{student.studentId}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveStudent(student._id)}
                            className="p-1.5 hover:bg-[#313244] text-[#f38ba8] rounded opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && <StudentProgressPanel sessionId={sessionId} />}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && <SessionMonitoringPanel sessionId={sessionId} />}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              {/* Status Toggle */}
              <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${session.isActive ? 'bg-[#a6e3a1]' : 'bg-[#f38ba8]'}`} />
                    <div>
                      <p className="text-sm font-medium text-[#cdd6f4]">{session.isActive ? 'Active' : 'Inactive'}</p>
                      <p className="text-xs text-[#6c7086]">
                        {session.isActive ? 'Students can access this session' : 'Students cannot access'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                      session.isActive
                        ? 'bg-[#f38ba8] hover:bg-[#f38ba8]/80 text-[#1e1e2e]'
                        : 'bg-[#a6e3a1] hover:bg-[#a6e3a1]/80 text-[#1e1e2e]'
                    }`}
                  >
                    {togglingStatus ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1e2e]" />
                    ) : session.isActive ? (
                      <><PowerOff className="w-4 h-4" /> Deactivate</>
                    ) : (
                      <><Power className="w-4 h-4" /> Activate</>
                    )}
                  </button>
                </div>
              </div>

              {/* Session Info */}
              <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
                <h3 className="text-sm font-medium text-[#cdd6f4] mb-3">Session Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[#6c7086]">Created</p>
                    <p className="text-[#cdd6f4]">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6c7086]">Scheduled</p>
                    <p className="text-[#cdd6f4]">{new Date(session.scheduledDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6c7086]">Time</p>
                    <p className="text-[#cdd6f4]">{session.startTime} - {session.endTime}</p>
                  </div>
                  {session.room && (
                    <div>
                      <p className="text-xs text-[#6c7086]">Room</p>
                      <p className="text-[#cdd6f4]">{session.room}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-[#181825] border border-[#f38ba8]/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#f38ba8]" />
                  <h3 className="text-sm font-medium text-[#f38ba8]">Danger Zone</h3>
                </div>
                <p className="text-xs text-[#6c7086] mb-3">
                  Permanently delete this session and all activities. This cannot be undone.
                </p>
                <button
                  onClick={handleDeleteSession}
                  disabled={deletingSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f38ba8] hover:bg-[#f38ba8]/80 text-[#1e1e2e] rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {deletingSession ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1e2e]" />
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Delete Session</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-xs font-medium transition flex items-center gap-1.5 border-b-2 -mb-[1px] ${
        active
          ? 'border-[#89b4fa] text-[#89b4fa]'
          : 'border-transparent text-[#6c7086] hover:text-[#cdd6f4]'
      }`}
    >
      {children}
    </button>
  );
}

export default LabSessionDetailPage;
