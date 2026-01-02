import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...dataToSend } = formData;
      const result = await register(dataToSend);

      if (result.success) {
        navigate(result.user.role === 'student' ? '/student/dashboard' : '/instructor/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-[#1e1e2e] border border-[#313244] rounded-lg text-sm text-[#cdd6f4] placeholder-[#45475a] focus:ring-1 focus:ring-[#89b4fa] focus:border-[#89b4fa] disabled:opacity-50";
  const labelClass = "block text-xs font-medium text-[#6c7086] mb-1";

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center p-4">
      <div className="bg-[#181825] rounded-xl border border-[#313244] p-6 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-5">
          <img src="/header.png" alt="YOURTWIN: CODE" className="h-14 mx-auto mb-3" />
          <p className="text-sm text-[#6c7086]">Create your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#f38ba8]/10 border border-[#f38ba8]/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#f38ba8] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#f38ba8]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'student' })}
              disabled={loading}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                formData.role === 'student'
                  ? 'bg-[#89b4fa] text-[#1e1e2e]'
                  : 'bg-[#313244] text-[#6c7086] hover:bg-[#45475a] hover:text-[#cdd6f4]'
              } disabled:opacity-50`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'instructor' })}
              disabled={loading}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                formData.role === 'instructor'
                  ? 'bg-[#a6e3a1] text-[#1e1e2e]'
                  : 'bg-[#313244] text-[#6c7086] hover:bg-[#45475a] hover:text-[#cdd6f4]'
              } disabled:opacity-50`}
            >
              Instructor
            </button>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Last Name *</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={loading} className={inputClass} placeholder="e.g., Dela Cruz" />
            </div>
            <div>
              <label className={labelClass}>First Name *</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={loading} className={inputClass} placeholder="e.g., Juan" />
            </div>
            <div>
              <label className={labelClass}>M.I.</label>
              <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} disabled={loading} className={inputClass} placeholder="e.g., S" maxLength={2} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email Address *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} className={inputClass} placeholder="e.g., juan.delacruz@mmsu.edu.ph" />
          </div>

          {/* Student-specific fields */}
          {formData.role === 'student' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Student ID *</label>
                  <input type="text" name="studentId" value={formData.studentId} onChange={handleChange} required disabled={loading} className={inputClass} placeholder="e.g., 2021-12345" />
                </div>
                <div>
                  <label className={labelClass}>Course *</label>
                  <select name="course" value={formData.course} onChange={handleChange} required disabled={loading} className={inputClass}>
                    <option value="BSIT">BSIT</option>
                    <option value="BSCS">BSCS</option>
                    <option value="BSIS">BSIS</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Year Level *</label>
                  <select name="yearLevel" value={formData.yearLevel} onChange={handleChange} required disabled={loading} className={inputClass}>
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Section *</label>
                  <input type="text" name="section" value={formData.section} onChange={handleChange} required disabled={loading} className={`${inputClass} uppercase`} placeholder="e.g., A, B, C" maxLength={2} />
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Password * <span className="text-[#45475a]">(min. 6 chars)</span></label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} disabled={loading} className={inputClass} placeholder="Enter password" />
            </div>
            <div>
              <label className={labelClass}>Confirm Password *</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={6} disabled={loading} className={inputClass} placeholder="Re-enter password" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1e2e]"></div>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#6c7086]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#89b4fa] hover:text-[#b4befe]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
