import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1e2e] to-[#181825] flex items-center justify-center p-4">
      <div className="bg-[#313244] rounded-lg shadow-2xl p-8 w-full max-w-md border border-[#45475a]">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#89b4fa] hover:underline mb-6">
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#cdd6f4]">Reset Password</h1>
          <p className="text-sm text-[#bac2de] mt-2">
            Enter your new password below.
          </p>
        </div>

        {!success ? (
          <>
            {error && (
              <div className="mb-6 p-4 bg-[#f38ba8]/10 border border-[#f38ba8] rounded-lg">
                <p className="text-sm text-[#f38ba8]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7086]" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-10 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c7086] hover:text-[#cdd6f4]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7086]" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] py-3 rounded-lg font-medium hover:opacity-90 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#1e1e2e]"></div>
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 bg-[#a6e3a1]/20 rounded-full flex items-center justify-center">
                <CheckCircle className="text-[#a6e3a1]" size={32} />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-[#cdd6f4]">Password Reset Successful</h2>
              <p className="text-sm text-[#bac2de] mt-2">
                Your password has been reset. Redirecting to login...
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full bg-[#89b4fa] text-[#1e1e2e] py-3 rounded-lg font-medium hover:opacity-90 transition text-center"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
