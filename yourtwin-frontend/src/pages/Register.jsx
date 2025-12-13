import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    studentId: '',
    course: 'BSIT',
    section: '',
    yearLevel: 1
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Remove confirmPassword before sending
      const { confirmPassword, ...dataToSend } = formData;
      
      const result = await register(dataToSend);
      
      if (result.success) {
        // Redirect based on role
        if (result.user.role === 'student') {
          navigate('/student/dashboard');
        } else {
          navigate('/instructor/dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1e2e] to-[#181825] flex items-center justify-center p-4">
      <div className="bg-[#313244] rounded-lg shadow-2xl p-8 w-full max-w-2xl border border-[#45475a]">
        <div className="text-center mb-6">
          <img src="/header.png" alt="YOURTWIN: CODE" className="h-15 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent mb-2">
            Create Account
          </h1>
          <p className="text-[#bac2de]">Join YOURTWIN: CODE</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-[#f38ba8]/10 border border-[#f38ba8] rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#f38ba8] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#f38ba8]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
              I am a...
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'student' })}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  formData.role === 'student'
                    ? 'bg-gradient-to-r from-[#89b4fa] to-[#74c7ec] text-[#1e1e2e]'
                    : 'bg-[#45475a] text-[#cdd6f4] hover:bg-[#585b70]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'instructor' })}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  formData.role === 'instructor'
                    ? 'bg-gradient-to-r from-[#a6e3a1] to-[#94e2d5] text-[#1e1e2e]'
                    : 'bg-[#45475a] text-[#cdd6f4] hover:bg-[#585b70]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Instructor
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086]"
                placeholder="Dela Cruz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086]"
                placeholder="Juan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086]"
                placeholder="Santos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="juan@mmsu.edu.ph"
              />
            </div>
          </div>

          {/* Student-specific fields */}
          {formData.role === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Student ID *
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  required={formData.role === 'student'}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="2021-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Course *
                </label>
                <select
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  required={formData.role === 'student'}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="BSIS">BSIS</option>
                  <option value="ACT">ACT</option>
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
                  required={formData.role === 'student'}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="3A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Year Level *
                </label>
                <select
                  name="yearLevel"
                  value={formData.yearLevel}
                  onChange={handleChange}
                  required={formData.role === 'student'}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] py-3 rounded-lg font-medium hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1e1e2e]"></div>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#bac2de]">
          <p>
            Already have an account?{' '}
            <a href="/login" className="text-[#89b4fa] hover:underline">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;