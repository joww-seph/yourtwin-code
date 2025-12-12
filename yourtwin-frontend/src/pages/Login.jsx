import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Redirect based on user role
        if (result.user.role === 'student') {
          navigate('/student/dashboard');
        } else if (result.user.role === 'instructor') {
          navigate('/instructor/dashboard');
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1e2e] to-[#181825] flex items-center justify-center p-4">
      <div className="bg-[#313244] rounded-lg shadow-2xl p-8 w-full max-w-md border border-[#45475a]">
        <div className="text-center mb-8">
          <img src="/header.png" alt="YOURTWIN: CODE" className="h-15 w-auto" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-[#f38ba8]/10 border border-[#f38ba8] rounded-lg">
            <p className="text-sm text-[#f38ba8]">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Role Selection */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setRole('student')}
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                role === 'student'
                  ? 'bg-gradient-to-r from-[#89b4fa] to-[#74c7ec] text-[#1e1e2e]'
                  : 'bg-[#45475a] text-[#cdd6f4] hover:bg-[#585b70]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setRole('instructor')}
              disabled={loading}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                role === 'instructor'
                  ? 'bg-gradient-to-r from-[#a6e3a1] to-[#94e2d5] text-[#1e1e2e]'
                  : 'bg-[#45475a] text-[#cdd6f4] hover:bg-[#585b70]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Instructor
            </button>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="student@mmsu.edu.ph"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] py-3 rounded-lg font-medium hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1e1e2e]"></div>
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#bac2de]">
          <p>Don't have an account? <a href="/register" className="text-[#89b4fa] hover:underline">Register</a></p>
        </div>

        {/* Test Accounts Info */}
        <div className="mt-6 p-4 bg-[#1e1e2e] border border-[#45475a] rounded-lg">
          <p className="text-xs font-medium text-[#89b4fa] mb-2">Test Accounts:</p>
          <div className="text-xs text-[#bac2de] space-y-1">
            <p>Student: marc@mmsu.edu.ph / student123</p>
            <p>Instructor: instructor@mmsu.edu.ph / instructor123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;