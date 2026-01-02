import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(identifier, password, rememberMe);

      if (result.success) {
        // Auto-redirect based on the user's actual role from backend
        navigate(result.user.role === 'student' ? '/student/dashboard' : '/instructor/dashboard');
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center p-4">
      <div className="bg-[#181825] rounded-xl border border-[#313244] p-6 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/header.png" alt="YOURTWIN: CODE" className="h-16 mx-auto mb-3" />
          <p className="text-sm text-[#6c7086]">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#f38ba8]/10 border border-[#f38ba8]/30 rounded-lg">
            <p className="text-xs text-[#f38ba8]">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Identifier */}
          <div>
            <label className="block text-xs font-medium text-[#6c7086] mb-1.5">
              Student ID or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#313244] rounded-lg text-sm text-[#cdd6f4] placeholder-[#45475a] focus:ring-1 focus:ring-[#89b4fa] focus:border-[#89b4fa] disabled:opacity-50"
              placeholder="e.g., 2021-12345 or email@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-[#6c7086] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-[#313244] rounded-lg text-sm text-[#cdd6f4] placeholder-[#45475a] focus:ring-1 focus:ring-[#89b4fa] focus:border-[#89b4fa] disabled:opacity-50"
              placeholder="Enter your password"
            />
          </div>

          {/* Remember Me & Forgot */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="w-3.5 h-3.5 rounded border-[#313244] bg-[#1e1e2e] text-[#89b4fa] focus:ring-[#89b4fa] focus:ring-offset-0"
              />
              <span className="text-[#6c7086]">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-[#89b4fa] hover:text-[#b4befe]">
              Forgot password?
            </Link>
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
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#6c7086]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#89b4fa] hover:text-[#b4befe]">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
