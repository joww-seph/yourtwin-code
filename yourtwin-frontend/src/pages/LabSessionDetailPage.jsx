import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import StudentSelector from '../components/StudentSelector';
import CreateActivityModal from '../components/CreateActivityModal';
import StudentProgressPanel from '../components/StudentProgressPanel';
import { labSessionAPI, studentAPI, activityAPI } from '../services/api';
import { showSuccess, showError, showDeleteConfirm } from '../utils/sweetalert';
import {
  ArrowLeft,
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
  User,
  Edit3,
  Copy,
  AlertTriangle,
  BarChart3,
  Shield
} from 'lucide-react';
import PlagiarismReport from '../components/PlagiarismReport';

function LabSessionDetailPage() {
  const { sessionId } = useParams();
  const { user } = useAuth();
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

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      const handleSessionUpdate = (data) => {
        console.log('📡 [Session Detail] Session updated', data);
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          fetchSessionDetails();
        }
      };

      const handleSessionDeleted = (data) => {
        console.log('📡 [Session Detail] Session deleted', data);
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          showError('Session Deleted', 'This session has been deleted.');
          navigate('/instructor/lab-sessions');
        }
      };

      const handleActivityUpdate = (data) => {
        console.log('📡 [Session Detail] Activity updated', data);
        if (data.sessionId === sessionId || data.sessionId?.toString() === sessionId) {
          fetchSessionDetails();
        }
      };

      // Lab session events
      socket.on('lab-session-updated', handleSessionUpdate);
      socket.on('lab-session-deleted', handleSessionDeleted);

      // Activity events
      socket.on('activity-created', handleActivityUpdate);
      socket.on('activity-updated', handleActivityUpdate);
      socket.on('activity-deleted', handleActivityUpdate);

      return () => {
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
        socket.off('activity-created');
        socket.off('activity-updated');
        socket.off('activity-deleted');
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
        console.error('❌ 403 Forbidden - You may not have access to this session');
        showError('Access Denied', 'You do not have permission to access this session. Please check your account role.');
        navigate('/instructor/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const response = await studentAPI.search({});
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch available students:', error);
      return [];
    }
  };

  const handleAddStudents = async (studentIds) => {
    try {
      const response = await labSessionAPI.addStudents(sessionId, studentIds);
      const { addedCount, failures, message } = response.data.data || {};

      setShowAddStudents(false);
      fetchSessionDetails();

      // Show appropriate message based on results
      if (addedCount > 0 && (!failures || failures.length === 0)) {
        showSuccess(message || `${addedCount} student(s) added successfully!`);
      } else if (addedCount > 0 && failures && failures.length > 0) {
        // Partial success
        showSuccess(message || `${addedCount} added, ${failures.length} failed`);
      }
    } catch (error) {
      console.error('Failed to add students:', error);
      // Extract error message from backend response
      const errorMessage = error.response?.data?.message || 'Failed to add students';
      showError('Failed to Add Students', errorMessage);
      // Still refresh to show current state
      fetchSessionDetails();
    }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      await labSessionAPI.removeStudent(sessionId, studentId);

      fetchSessionDetails();
      showSuccess('Student removed successfully!');
    } catch (error) {
      console.error('Failed to remove student:', error);
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
        console.error('Failed to delete activity:', error);
        showError('Failed to delete activity', 'Please try again.');
      }
    }
  };

  const handleCreateActivity = async (activityData) => {
    setCreatingActivity(true);
    try {
      if (activityModalMode === 'edit' && editingActivity) {
        // Update existing activity
        await activityAPI.update(editingActivity._id, activityData);
        showSuccess('Activity updated successfully!');
      } else {
        // Create new activity (or duplicate)
        await labSessionAPI.createActivity(sessionId, activityData);
        showSuccess(activityModalMode === 'duplicate' ? 'Activity duplicated successfully!' : 'Activity created successfully!');
      }
      setShowActivityForm(false);
      setEditingActivity(null);
      setActivityModalMode('create');
      fetchSessionDetails();
    } catch (error) {
      console.error('Failed to save activity:', error);
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
        console.error('Failed to delete session:', error);
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

    // Reorder activities array
    const newActivities = [...activities];
    const [movedActivity] = newActivities.splice(draggedActivity, 1);
    newActivities.splice(dropIndex, 0, movedActivity);

    // Update local state immediately for better UX
    setActivities(newActivities);
    setDraggedActivity(null);

    // Update order in backend
    try {
      const updates = newActivities.map((activity, index) => ({
        id: activity._id,
        orderInSession: index + 1
      }));

      // Update each activity's order
      for (const update of updates) {
        await activityAPI.update(update.id, { orderInSession: update.orderInSession });
      }
      showSuccess('Activity order updated successfully!');
    } catch (error) {
      console.error('Failed to update activity order:', error);
      showError('Failed to update activity order', 'Please refresh the page.');
      fetchSessionDetails(); // Refresh to get correct order
    }
  };

  const handleDragEnd = () => {
    setDraggedActivity(null);
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      if (session.isActive) {
        await labSessionAPI.deactivate(sessionId);
        showSuccess('Session deactivated successfully!');
      } else {
        await labSessionAPI.activate(sessionId);
        showSuccess('Session activated successfully!');
      }
      fetchSessionDetails();
    } catch (error) {
      console.error('Failed to toggle session status:', error);
      showError('Failed to update session status', 'Please try again.');
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <p className="text-[#f38ba8]">Session not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Header with Session Info */}
      <header className="bg-[#313244] border-b border-[#45475a] px-6 py-6">
        <div className="max-w-7xl mx-auto">
          {/* Title and Back Button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/instructor/dashboard')}
                className="p-2 hover:bg-[#45475a] rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-[#bac2de]" />
              </button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent">
                  {session.title}
                </h1>
                <p className="text-sm text-[#bac2de] mt-1">{session.description}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              session.isActive
                ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
            }`}>
              {session.isActive ? '🔵 Active' : '⚫ Inactive'}
            </span>
          </div>

          {/* Session Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {/* Course/Year/Section */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#45475a] rounded">
                <BookOpen className="w-4 h-4 text-[#cba6f7]" />
              </div>
              <div>
                <p className="text-[#6c7086] text-xs">Target Audience</p>
                <p className="text-[#cdd6f4] font-medium">{session.course} {session.yearLevel}-{session.section}</p>
              </div>
            </div>

            {/* Scheduled Date */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#45475a] rounded">
                <Calendar className="w-4 h-4 text-[#89b4fa]" />
              </div>
              <div>
                <p className="text-[#6c7086] text-xs">Scheduled</p>
                <p className="text-[#cdd6f4] font-medium">{new Date(session.scheduledDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#45475a] rounded">
                <Clock className="w-4 h-4 text-[#a6e3a1]" />
              </div>
              <div>
                <p className="text-[#6c7086] text-xs">Time</p>
                <p className="text-[#cdd6f4] font-medium">{session.startTime} - {session.endTime}</p>
              </div>
            </div>

            {/* Room (if available) */}
            {session.room && (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#45475a] rounded">
                  <MapPin className="w-4 h-4 text-[#f38ba8]" />
                </div>
                <div>
                  <p className="text-[#6c7086] text-xs">Location</p>
                  <p className="text-[#cdd6f4] font-medium">{session.room}</p>
                </div>
              </div>
            )}

            {/* Instructor (if available) */}
            {session.instructor && (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#45475a] rounded">
                  <User className="w-4 h-4 text-[#f9e2af]" />
                </div>
                <div>
                  <p className="text-[#6c7086] text-xs">Instructor</p>
                  <p className="text-[#cdd6f4] font-medium">
                    {typeof session.instructor === 'object'
                      ? `Prof. ${session.instructor.firstName} ${session.instructor.lastName}`
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#313244] border-b border-[#45475a] px-6">
        <div className="max-w-7xl mx-auto flex gap-4">
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-3 border-b-2 font-medium transition ${
              activeTab === 'activities'
                ? 'border-[#89b4fa] text-[#89b4fa]'
                : 'border-transparent text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Activities ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-3 border-b-2 font-medium transition ${
              activeTab === 'students'
                ? 'border-[#89b4fa] text-[#89b4fa]'
                : 'border-transparent text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Students ({allowedStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-3 border-b-2 font-medium transition ${
              activeTab === 'progress'
                ? 'border-[#89b4fa] text-[#89b4fa]'
                : 'border-transparent text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Progress
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 border-b-2 font-medium transition ${
              activeTab === 'settings'
                ? 'border-[#89b4fa] text-[#89b4fa]'
                : 'border-transparent text-[#bac2de] hover:text-[#cdd6f4]'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#cdd6f4]">Lab Activities</h2>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="flex items-center gap-2 px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                New Activity
              </button>
            </div>

            {/* Create/Edit Activity Modal */}
            <CreateActivityModal
              isOpen={showActivityForm}
              onClose={handleCloseActivityModal}
              onSubmit={handleCreateActivity}
              loading={creatingActivity}
              initialData={editingActivity}
              mode={activityModalMode}
            />

            {/* Activities List */}
            {activities.length === 0 ? (
              <div className="bg-[#313244] border border-[#45475a] rounded-lg p-8 text-center">
                <BookOpen className="w-12 h-12 text-[#6c7086] mx-auto mb-4" />
                <p className="text-[#bac2de] mb-4">No activities in this session yet</p>
                <button
                  onClick={() => setShowActivityForm(true)}
                  className="px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded-lg transition"
                >
                  Create the first activity
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <div
                    key={activity._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-[#313244] border border-[#45475a] rounded-lg p-4 hover:border-[#585b70] transition flex items-start justify-between group cursor-move ${
                      draggedActivity === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-[#45475a] rounded text-[#bac2de] text-sm font-medium mt-1 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#6c7086] bg-[#45475a] px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <h3 className="text-lg font-bold text-[#cdd6f4]">
                            {activity.title}
                          </h3>
                        </div>
                        <p className="text-sm text-[#bac2de] mb-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-[#bac2de]">
                          {activity.topic && (
                            <span className="px-2 py-1 bg-[#45475a] rounded">
                              {activity.topic}
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded ${
                            activity.difficulty === 'easy'
                              ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                              : activity.difficulty === 'medium'
                              ? 'bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]'
                              : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
                          }`}>
                            {activity.difficulty}
                          </span>
                          <span className={`px-2 py-1 rounded ${
                            activity.type === 'practice'
                              ? 'bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]'
                              : 'bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]'
                          }`}>
                            {activity.type}
                          </span>
                          {/* Language badge */}
                          <span className="px-2 py-1 rounded bg-[#94e2d5] bg-opacity-20 text-[#94e2d5] uppercase font-medium">
                            {activity.language}
                          </span>
                          {/* Time limit badge */}
                          {activity.timeLimit && (
                            <span className="px-2 py-1 rounded bg-[#6c7086] bg-opacity-20 text-[#bac2de] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {activity.timeLimit} min
                            </span>
                          )}
                          {/* Test cases count */}
                          {activity.testCases && activity.testCases.length > 0 && (
                            <span className="px-2 py-1 rounded bg-[#f9e2af] bg-opacity-20 text-[#f9e2af]">
                              {activity.testCases.length} test{activity.testCases.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditActivity(activity);
                        }}
                        className="p-2 hover:bg-[#45475a] text-[#89b4fa] rounded-lg transition"
                        title="Edit activity"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateActivity(activity);
                        }}
                        className="p-2 hover:bg-[#45475a] text-[#a6e3a1] rounded-lg transition"
                        title="Duplicate activity"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlagiarismActivity(activity);
                        }}
                        className="p-2 hover:bg-[#45475a] text-[#cba6f7] rounded-lg transition"
                        title="Check plagiarism"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteActivity(activity._id);
                        }}
                        className="p-2 hover:bg-[#45475a] text-[#f38ba8] rounded-lg transition"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plagiarism Report Modal */}
        {plagiarismActivity && (
          <PlagiarismReport
            activityId={plagiarismActivity._id}
            activityTitle={plagiarismActivity.title}
            onClose={() => setPlagiarismActivity(null)}
          />
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#cdd6f4]">Enrolled Students</h2>
              <button
                onClick={() => setShowAddStudents(!showAddStudents)}
                className="flex items-center gap-2 px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Add Students
              </button>
            </div>

            {/* Student Selector Component */}
            {showAddStudents && (
              <div className="mb-6">
                <StudentSelector
                  onStudentsSelected={handleAddStudents}
                  excludeStudentIds={allowedStudents.map(s => s._id)}
                  maxHeight="600px"
                  sessionInfo={{
                    course: session.course,
                    yearLevel: session.yearLevel,
                    section: session.section
                  }}
                />
                <button
                  onClick={() => setShowAddStudents(false)}
                  className="mt-4 w-full px-4 py-2 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] font-medium rounded-lg transition"
                >
                  Done
                </button>
              </div>
            )}

            {/* Enrolled Students List */}
            {allowedStudents.length === 0 ? (
              <div className="bg-[#313244] border border-[#45475a] rounded-lg p-8 text-center">
                <Users className="w-12 h-12 text-[#6c7086] mx-auto mb-4" />
                <p className="text-[#bac2de] mb-4">No students enrolled in this session yet</p>
                <button
                  onClick={() => setShowAddStudents(true)}
                  className="px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium rounded-lg transition"
                >
                  Add the first student
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {allowedStudents.map((student) => (
                  <div
                    key={student._id}
                    className="bg-[#313244] border border-[#45475a] rounded-lg p-4 flex items-center justify-between hover:border-[#585b70] transition group"
                  >
                    <div className="flex-1">
                      <p className="text-[#cdd6f4] font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-[#bac2de]">
                        {student.studentId}
                        {student.course && ` • ${student.course}`}
                        {student.yearLevel && ` • Year ${student.yearLevel}`}
                        {student.section && ` • ${student.section}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveStudent(student._id)}
                      className="p-2 hover:bg-[#45475a] text-[#f38ba8] rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <StudentProgressPanel sessionId={sessionId} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
              <h2 className="text-xl font-bold text-[#cdd6f4] mb-6">Session Settings</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[#cdd6f4] font-medium mb-3">
                    Session Status
                  </label>
                  <div className="flex items-center justify-between p-4 bg-[#1e1e2e] rounded-lg border border-[#45475a]">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        session.isActive ? 'bg-[#a6e3a1]' : 'bg-[#f38ba8]'
                      }`}></div>
                      <div>
                        <p className="text-[#cdd6f4] font-medium">
                          {session.isActive ? 'Active' : 'Inactive'}
                        </p>
                        <p className="text-sm text-[#bac2de]">
                          {session.isActive
                            ? 'Students can access this session'
                            : 'Students cannot access this session'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleStatus}
                      disabled={togglingStatus}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        session.isActive
                          ? 'bg-[#f38ba8] hover:bg-[#f38ba8]/80 text-[#1e1e2e]'
                          : 'bg-[#a6e3a1] hover:bg-[#a6e3a1]/80 text-[#1e1e2e]'
                      }`}
                    >
                      {togglingStatus ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1e2e]"></div>
                          {session.isActive ? 'Deactivating...' : 'Activating...'}
                        </>
                      ) : (
                        <>
                          {session.isActive ? (
                            <>
                              <PowerOff className="w-4 h-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4" />
                              Activate
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#45475a] pt-4">
                  <h3 className="text-[#cdd6f4] font-medium mb-3">Session Information</h3>
                  <div className="space-y-2 text-sm text-[#bac2de]">
                    <p>
                      <span className="text-[#6c7086]">Created on:</span>{' '}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="text-[#6c7086]">Scheduled for:</span>{' '}
                      {new Date(session.scheduledDate).toLocaleDateString()}
                    </p>
                    <p>
                      <span className="text-[#6c7086]">Time:</span>{' '}
                      {session.startTime} - {session.endTime}
                    </p>
                    {session.room && (
                      <p>
                        <span className="text-[#6c7086]">Room:</span>{' '}
                        {session.room}
                      </p>
                    )}
                  </div>
                </div>

                {/* Edit Session */}
                <div className="border-t border-[#45475a] pt-4">
                  <h3 className="text-[#cdd6f4] font-medium mb-3">Edit Session</h3>
                  <p className="text-sm text-[#bac2de] mb-4">
                    Modify session details like title, description, schedule, and target audience.
                  </p>
                  <button
                    onClick={() => navigate(`/instructor/lab-sessions/${sessionId}/edit`)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] rounded-lg font-medium transition"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Session Details
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="border-t border-[#f38ba8] border-opacity-30 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-[#f38ba8]" />
                    <h3 className="text-[#f38ba8] font-medium">Danger Zone</h3>
                  </div>
                  <p className="text-sm text-[#bac2de] mb-4">
                    Permanently delete this lab session and all its activities. This action cannot be undone.
                  </p>
                  <button
                    onClick={handleDeleteSession}
                    disabled={deletingSession}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f38ba8] hover:bg-[#f38ba8]/80 text-[#1e1e2e] rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingSession ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1e2e]"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Session
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default LabSessionDetailPage;
