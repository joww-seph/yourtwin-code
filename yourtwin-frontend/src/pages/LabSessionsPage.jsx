import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { labSessionAPI } from '../services/api';
import { showSuccess, showError, showDeleteConfirm } from '../utils/sweetalert';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

function LabSessionsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, ongoing, completed

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  // Listen for real-time updates
  useEffect(() => {
    if (socket) {
      const handleRefresh = () => {
        console.log('📡 [Instructor] Lab session event received - refreshing');
        fetchSessions();
      };

      socket.on('lab-session-created', handleRefresh);
      socket.on('lab-session-updated', handleRefresh);
      socket.on('lab-session-deleted', handleRefresh);

      return () => {
        socket.off('lab-session-created');
        socket.off('lab-session-updated');
        socket.off('lab-session-deleted');
      };
    }
  }, [socket]);

  const fetchSessions = async () => {
    try {
      let allSessions = [];
      
      if (filter === 'all') {
        // Get all sessions without status filter
        const response = await labSessionAPI.getAll();
        allSessions = response.data.data;
      } else {
        // Get sessions filtered by status
        const response = await labSessionAPI.getAll();
        // Frontend filtering - in case backend doesn't fully support it
        allSessions = response.data.data.filter(s => s.status === filter);
      }
      
      setSessions(allSessions);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Header */}
      <header className="bg-[#313244] border-b border-[#45475a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/instructor/dashboard')}
              className="p-2 hover:bg-[#45475a] rounded-lg transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-[#bac2de]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#cdd6f4]">Laboratory Sessions</h1>
              <p className="text-sm text-[#bac2de] mt-1">Manage your lab sessions and activities</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/instructor/lab-sessions/create')}
            className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Session
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {['all', 'scheduled', 'ongoing', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                filter === status
                  ? 'bg-[#89b4fa] text-[#1e1e2e]'
                  : 'bg-[#313244] text-[#bac2de] hover:bg-[#45475a]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-[#6c7086] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#cdd6f4] mb-2">No Lab Sessions Yet</h3>
            <p className="text-[#bac2de] mb-6">Create your first lab session to get started</p>
            <button
              onClick={() => navigate('/instructor/lab-sessions/create')}
              className="px-6 py-3 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg font-medium hover:opacity-90 transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Lab Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sessions.map((session) => (
              <SessionCard
                key={session._id}
                session={session}
                onEdit={() => navigate(`/instructor/lab-sessions/${session._id}/edit`)}
                onDelete={() => handleDelete(session._id)}
                onView={() => navigate(`/instructor/lab-sessions/${session._id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SessionCard({ session, onEdit, onDelete, onView }) {
  const statusColors = {
    scheduled: 'bg-[#89b4fa] bg-opacity-20 text-[#89b4fa] border-[#89b4fa]',
    ongoing: 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1] border-[#a6e3a1]',
    completed: 'bg-[#6c7086] bg-opacity-20 text-[#bac2de] border-[#6c7086]',
    cancelled: 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8] border-[#f38ba8]'
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6 hover:border-[#89b4fa] transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-[#cdd6f4]">{session.title}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[session.status]}`}>
              {session.status}
            </span>
          </div>
          <p className="text-sm text-[#bac2de] mb-3">{session.description}</p>
          
          <div className="flex flex-wrap gap-4 text-sm text-[#bac2de]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {formatDate(session.scheduledDate)}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {session.startTime} - {session.endTime}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {session.course} {session.yearLevel}-{session.section}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-[#45475a] rounded-lg transition"
            title="Edit"
          >
            <Edit className="w-4 h-4 text-[#89b4fa]" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-[#45475a] rounded-lg transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-[#f38ba8]" />
          </button>
          <button
            onClick={onView}
            className="p-2 hover:bg-[#45475a] rounded-lg transition"
            title="View Details"
          >
            <ChevronRight className="w-4 h-4 text-[#cdd6f4]" />
          </button>
        </div>
      </div>

      {/* Activities Count */}
      <div className="flex items-center gap-2 text-sm">
        <span className="px-3 py-1 bg-[#45475a] rounded-full text-[#bac2de]">
          {session.activities?.length || 0} activities
        </span>
      </div>
    </div>
  );
}

export default LabSessionsPage;