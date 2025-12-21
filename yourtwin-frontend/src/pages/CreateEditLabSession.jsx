import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { labSessionAPI } from '../services/api';
import { showSuccess, showError } from '../utils/sweetalert';
import { ArrowLeft, Save, Calendar, Clock, Users, BookOpen } from 'lucide-react';

function CreateEditLabSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(sessionId);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: 'BSIT',
    yearLevel: 1,
    section: '',
    scheduledDate: '',
    startTime: '',
    endTime: '',
    room: '',
    status: 'scheduled',
    allowLateSubmission: false,
    lateSubmissionDeadline: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await labSessionAPI.getOne(sessionId);
      const session = response.data.data;

      // Format date for input field
      const scheduledDate = new Date(session.scheduledDate).toISOString().split('T')[0];
      const lateDeadline = session.lateSubmissionDeadline
        ? new Date(session.lateSubmissionDeadline).toISOString().split('T')[0]
        : '';

      setFormData({
        title: session.title,
        description: session.description,
        course: session.course,
        yearLevel: session.yearLevel,
        section: session.section,
        scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        room: session.room || '',
        status: session.status,
        allowLateSubmission: session.allowLateSubmission,
        lateSubmissionDeadline: lateDeadline
      });
    } catch (error) {
      console.error('Failed to fetch session:', error);
      showError('Failed to load session', 'Please try again.');
      navigate('/instructor/lab-sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      showError('Validation Error', 'Please enter a session title.');
      return;
    }
    if (!formData.description.trim()) {
      showError('Validation Error', 'Please enter a description.');
      return;
    }
    if (!formData.section.trim()) {
      showError('Validation Error', 'Please enter a section.');
      return;
    }
    if (!formData.scheduledDate) {
      showError('Validation Error', 'Please select a scheduled date.');
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      showError('Validation Error', 'Please enter start and end times.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        course: formData.course,
        yearLevel: parseInt(formData.yearLevel),
        section: formData.section.trim().toUpperCase(),
        scheduledDate: formData.scheduledDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        room: formData.room.trim(),
        status: formData.status,
        allowLateSubmission: formData.allowLateSubmission,
        lateSubmissionDeadline: formData.allowLateSubmission && formData.lateSubmissionDeadline
          ? formData.lateSubmissionDeadline
          : undefined
      };

      if (isEditMode) {
        await labSessionAPI.update(sessionId, payload);
        showSuccess('Lab session updated successfully!');
      } else {
        await labSessionAPI.create(payload);
        showSuccess('Lab session created successfully!');
      }

      navigate('/instructor/lab-sessions');
    } catch (error) {
      console.error('Failed to save session:', error);
      const errorMessage = error.response?.data?.message || 'Please try again.';
      showError('Failed to save session', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/instructor/lab-sessions')}
              className="p-2 hover:bg-[#45475a] rounded-lg transition"
              title="Back to Sessions"
            >
              <ArrowLeft className="w-5 h-5 text-[#bac2de]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#cdd6f4]">
                {isEditMode ? 'Edit Lab Session' : 'Create Lab Session'}
              </h1>
              <p className="text-sm text-[#bac2de] mt-1">
                {isEditMode ? 'Update session details' : 'Set up a new laboratory session'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#89b4fa]" />
              <h2 className="text-lg font-bold text-[#cdd6f4]">Basic Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Week 1 - Introduction to Programming"
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of this lab session..."
                  rows="3"
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Class Information */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#a6e3a1]" />
              <h2 className="text-lg font-bold text-[#cdd6f4]">Class Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Course *
                </label>
                <select
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                >
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSIS">BSIS</option>
                  <option value="ACT">ACT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Year Level *
                </label>
                <select
                  name="yearLevel"
                  value={formData.yearLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Section *
                </label>
                <input
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  placeholder="e.g., A, B, C"
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] transition uppercase"
                  required
                />
              </div>
            </div>
          </div>

          {/* Schedule Information */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#cba6f7]" />
              <h2 className="text-lg font-bold text-[#cdd6f4]">Schedule</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Scheduled Date *
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Room
                </label>
                <input
                  type="text"
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  placeholder="e.g., CS Lab 1"
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Session Settings */}
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#f9e2af]" />
              <h2 className="text-lg font-bold text-[#cdd6f4]">Session Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="allowLateSubmission"
                  checked={formData.allowLateSubmission}
                  onChange={handleChange}
                  className="w-4 h-4 bg-[#181825] border-[#45475a] rounded text-[#89b4fa] focus:ring-[#89b4fa]"
                />
                <label className="text-sm text-[#cdd6f4]">
                  Allow late submissions
                </label>
              </div>

              {formData.allowLateSubmission && (
                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Late Submission Deadline
                  </label>
                  <input
                    type="date"
                    name="lateSubmissionDeadline"
                    value={formData.lateSubmissionDeadline}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/instructor/lab-sessions')}
              className="px-6 py-2 bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditMode ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default CreateEditLabSession;
