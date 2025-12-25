import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { ArrowLeft, Mail, CheckCircle, Copy } from 'lucide-react';

function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetData, setResetData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(identifier);
      setResetData(response.data.data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate reset link');
    } finally {
      setLoading(false);
    }
  };

  const copyResetLink = () => {
    const fullUrl = `${window.location.origin}${resetData.resetUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1e2e] to-[#181825] flex items-center justify-center p-4">
      <div className="bg-[#313244] rounded-lg shadow-2xl p-8 w-full max-w-md border border-[#45475a]">
        <Link to="/login" className="inline-flex items-center gap-2 text-[#89b4fa] hover:underline mb-6">
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#cdd6f4]">Forgot Password</h1>
          <p className="text-sm text-[#bac2de] mt-2">
            Enter your email, student ID, or employee ID to reset your password.
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
                  Email, Student ID, or Employee ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7086]" size={18} />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                    placeholder="Enter your identifier"
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
                    Generating...
                  </>
                ) : (
                  'Generate Reset Link'
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
              <h2 className="text-lg font-semibold text-[#cdd6f4]">Reset Link Generated</h2>
              <p className="text-sm text-[#bac2de] mt-2">
                For: <span className="text-[#89b4fa]">{resetData.userName}</span> ({resetData.userEmail})
              </p>
            </div>

            <div className="bg-[#1e1e2e] p-4 rounded-lg border border-[#45475a]">
              <p className="text-xs text-[#6c7086] mb-2">Reset Link (expires in {resetData.expiresIn}):</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm text-[#a6e3a1] break-all">
                  {window.location.origin}{resetData.resetUrl}
                </code>
                <button
                  onClick={copyResetLink}
                  className="p-2 bg-[#45475a] rounded hover:bg-[#585b70] transition"
                  title="Copy link"
                >
                  <Copy size={16} className={copied ? 'text-[#a6e3a1]' : 'text-[#cdd6f4]'} />
                </button>
              </div>
              {copied && <p className="text-xs text-[#a6e3a1] mt-2">Copied to clipboard!</p>}
            </div>

            <p className="text-xs text-[#6c7086] text-center">
              Share this link with the user or use it directly to reset the password.
            </p>

            <div className="flex gap-4">
              <Link
                to={resetData.resetUrl}
                className="flex-1 bg-[#89b4fa] text-[#1e1e2e] py-2 rounded-lg font-medium hover:opacity-90 transition text-center"
              >
                Reset Now
              </Link>
              <Link
                to="/login"
                className="flex-1 bg-[#45475a] text-[#cdd6f4] py-2 rounded-lg font-medium hover:bg-[#585b70] transition text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
