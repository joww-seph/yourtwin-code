import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { labSessionAPI } from '../services/api';
import { showSuccess, showError } from '../utils/sweetalert';
import Layout from '../components/Layout';
import { Save, Calendar, Users, BookOpen, ArrowLeft, Code, X, Plus } from 'lucide-react';

// Language options with display labels
const LANGUAGES = [
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' }
];

// Common sections
const COMMON_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

function CreateEditLabSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(sessionId);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: 'BSIT',
    yearLevel: 1,
    sections: [],
    language: 'python',
    scheduledDate: '',
    startTime: '',
    endTime: ''
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

      // Handle both old 'section' and new 'sections' field
      const sections = session.sections || (session.section ? [session.section] : []);

      setFormData({
        title: session.title,
        description: session.description,
        course: session.course,
        yearLevel: session.yearLevel,
        sections: sections,
        language: session.language || 'python',
        scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleSection = (section) => {
    setFormData(prev => {
      const sections = prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section].sort();
      return { ...prev, sections };
    });
  };

  const addCustomSection = () => {
    const section = prompt('Enter custom section name (e.g., G, H, or 1A):');
    if (section && section.trim()) {
      const normalized = section.trim().toUpperCase();
      if (!formData.sections.includes(normalized)) {
        setFormData(prev => ({
          ...prev,
          sections: [...prev.sections, normalized].sort()
        }));
      }
    }
  };

  const removeSection = (section) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s !== section)
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
    if (formData.sections.length === 0) {
      showError('Validation Error', 'Please select at least one section.');
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
        sections: formData.sections,
        language: formData.language,
        scheduledDate: formData.scheduledDate,
        startTime: formData.startTime,
        endTime: formData.endTime
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa]"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/instructor/lab-sessions')}
            className="p-2 hover:bg-[#313244] rounded-lg transition"
            title="Back to Lab Sessions"
          >
            <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#cdd6f4]">
              {isEditMode ? 'Edit Lab Session' : 'Create Lab Session'}
            </h1>
            <p className="text-base text-[#6c7086]">
              {isEditMode ? 'Update session details' : 'Set up a new laboratory session'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-[#89b4fa]" />
              <h2 className="text-sm font-semibold text-[#cdd6f4]">Basic Information</h2>
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
                  rows="2"
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Class & Language */}
          <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#a6e3a1]" />
              <h2 className="text-sm font-semibold text-[#cdd6f4]">Class & Language</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
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
                  Language *
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#181825] border border-[#45475a] rounded-lg text-[#cdd6f4] focus:outline-none focus:border-[#89b4fa] transition"
                  required
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section Selection */}
            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                Sections * <span className="text-[#6c7086] font-normal">(select one or more)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_SECTIONS.map(section => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => toggleSection(section)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                      formData.sections.includes(section)
                        ? 'bg-[#a6e3a1] text-[#1e1e2e]'
                        : 'bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]'
                    }`}
                  >
                    {section}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addCustomSection}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a] transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>

              {/* Selected sections display */}
              {formData.sections.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-[#313244]">
                  <span className="text-xs text-[#6c7086]">Selected:</span>
                  {formData.sections.map(section => (
                    <span
                      key={section}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#89b4fa]/20 text-[#89b4fa] rounded text-xs"
                    >
                      {section}
                      <button
                        type="button"
                        onClick={() => removeSection(section)}
                        className="hover:text-[#f38ba8]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Schedule Information */}
          <div className="bg-[#181825] border border-[#313244] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#cba6f7]" />
              <h2 className="text-sm font-semibold text-[#cdd6f4]">Schedule</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Date *
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

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/instructor/lab-sessions')}
              className="px-4 py-2 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-lg transition text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg hover:opacity-90 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default CreateEditLabSession;
