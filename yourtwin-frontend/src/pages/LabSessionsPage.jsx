import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI } from '../services/api';
import { showSuccess, showError, showDeleteConfirm } from '../utils/sweetalert';
import Layout from '../components/Layout';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle,
  RotateCcw
} from 'lucide-react';

function LabSessionsPage() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  useEffect(() => {
    if (socket) {
      const handleRefresh = () => fetchSessions();
      socket.on('lab-session-created', handleRefresh);
      socket.on('lab-session-updated', handleRefresh);
      socket.on('lab-session-deleted', handleRefresh);
      socket.on('lab-session-activated', handleRefresh);
      socket.on('lab-session-deactivated', handleRefresh);
      socket.on('lab-session-completed', handleRefresh);

      return () => {
        socket.off('lab-session-created');
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
        socket.off('lab-session-activated');
        socket.off('lab-session-deactivated');
        socket.off('lab-session-completed');
      };
    }
  }, [socket]);

  const fetchSessions = async () => {
    try {
      const response = await labSessionAPI.getAll();
      const allSessions = response.data.data;
      if (filter === 'all') {
        setSessions(allSessions);
      } else if (filter === 'active') {
        setSessions(allSessions.filter(s => !s.isCompleted));
      } else if (filter === 'completed') {
        setSessions(allSessions.filter(s => s.isCompleted));
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId) => {
    const result = await showDeleteConfirm('this lab session');
    if (!result.isConfirmed) return;

    try {
      await labSessionAPI.delete(sessionId);
      fetchSessions();
      showSuccess('Lab session deleted successfully!');
    } catch (error) {
      showError('Failed to delete session', 'Please try again.');
    }
  };

  const handleMarkComplete = async (sessionId) => {
    try {
      await labSessionAPI.markComplete(sessionId);
      fetchSessions();
      showSuccess('Lab session marked as complete!');
    } catch (error) {
      showError('Failed to complete session', 'Please try again.');
    }
  };

  const handleReopen = async (sessionId) => {
    try {
      await labSessionAPI.reopen(sessionId);
      fetchSessions();
      showSuccess('Lab session reopened!');
    } catch (error) {
      showError('Failed to reopen session', 'Please try again.');
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

  return (
    <Layout>
      <div className="space-y-5">
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
              <h1 className="text-2xl font-bold text-[#cdd6f4]">Laboratory Sessions</h1>
              <p className="text-base text-[#6c7086]">Manage your lab sessions and activities</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/instructor/lab-sessions/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition font-medium text-base"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create Session</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-lg text-base font-medium transition ${
                filter === item.value
                  ? 'bg-[#89b4fa] text-[#1e1e2e]'
                  : 'bg-[#313244] text-[#bac2de] hover:bg-[#45475a]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="bg-[#181825] border border-[#313244] rounded-lg">
          {sessions.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-8 h-8 text-[#45475a] mx-auto mb-2" />
              <p className="text-sm text-[#6c7086] mb-4">No lab sessions found</p>
              <button
                onClick={() => navigate('/instructor/lab-sessions/create')}
                className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg font-medium text-sm hover:opacity-90 transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Session
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#313244]">
              {sessions.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onEdit={() => navigate(`/instructor/lab-sessions/${session._id}/edit`)}
                  onDelete={() => handleDelete(session._id)}
                  onView={() => navigate(`/instructor/lab-sessions/${session._id}`)}
                  onMarkComplete={() => handleMarkComplete(session._id)}
                  onReopen={() => handleReopen(session._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function SessionCard({ session, onEdit, onDelete, onView, onMarkComplete, onReopen }) {
  const handleCardClick = (e) => {
    // Don't navigate if clicking on action buttons
    if (e.target.closest('.action-buttons')) return;
    onView();
  };

  return (
    <div
      onClick={handleCardClick}
      className="px-5 py-4 flex items-center gap-4 hover:bg-[#313244]/50 transition cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
        session.isCompleted
          ? 'bg-[#6c7086]/20'
          : 'bg-gradient-to-br from-[#89b4fa]/20 to-[#cba6f7]/20'
      }`}>
        <Calendar className={`w-6 h-6 ${session.isCompleted ? 'text-[#6c7086]' : 'text-[#89b4fa]'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className={`font-semibold text-lg truncate ${
            session.isCompleted ? 'text-[#6c7086]' : 'text-[#cdd6f4]'
          }`}>{session.title}</h3>
          {session.isCompleted ? (
            <span className="text-sm px-2 py-0.5 rounded-lg font-medium bg-[#6c7086]/20 text-[#a6adc8]">
              Completed
            </span>
          ) : session.isActive ? (
            <span className="text-sm px-2 py-0.5 rounded-lg font-medium bg-[#a6e3a1]/20 text-[#a6e3a1]">
              Active
            </span>
          ) : (
            <span className="text-sm px-2 py-0.5 rounded-lg font-medium bg-[#f9e2af]/20 text-[#f9e2af]">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-[#a6adc8]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {new Date(session.scheduledDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {session.course} {session.yearLevel}-{Array.isArray(session.sections) ? session.sections.join(', ') : session.section}
          </span>
          <span className="text-[#6c7086]">{session.activities?.length || 0} activities</span>
        </div>
      </div>
      <div className="action-buttons flex items-center gap-2 flex-shrink-0">
        {session.isCompleted ? (
          <button
            onClick={(e) => { e.stopPropagation(); onReopen(); }}
            className="p-2.5 hover:bg-[#45475a] rounded-lg transition"
            title="Reopen Session"
          >
            <RotateCcw className="w-5 h-5 text-[#a6e3a1]" />
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkComplete(); }}
            className="p-2.5 hover:bg-[#45475a] rounded-lg transition"
            title="Mark as Complete"
          >
            <CheckCircle className="w-5 h-5 text-[#a6e3a1]" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2.5 hover:bg-[#45475a] rounded-lg transition"
          title="Edit Session"
        >
          <Edit className="w-5 h-5 text-[#89b4fa]" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2.5 hover:bg-[#45475a] rounded-lg transition"
          title="Delete Session"
        >
          <Trash2 className="w-5 h-5 text-[#f38ba8]" />
        </button>
      </div>
    </div>
  );
}

export default LabSessionsPage;