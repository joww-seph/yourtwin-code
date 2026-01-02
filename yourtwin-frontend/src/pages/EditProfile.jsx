import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import Layout from '../components/Layout';
import { User, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

function EditProfile() {
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        middleName: user.middleName || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        setError('Current password is required to change password');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName
      };

      if (formData.newPassword) {
        updateData.password = formData.newPassword;
      }

      const response = await authAPI.updateProfile(updateData);

      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        if (loadUser) loadUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getDashboardRoute = () => {
    return user?.role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(getDashboardRoute())}
            className="p-2 hover:bg-[#313244] rounded-lg transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-[#cdd6f4]" />
          </button>
          <h1 className="text-2xl font-bold text-[#cdd6f4]">Edit Profile</h1>
        </div>

        <div className="bg-[#181825] rounded-lg border border-[#313244] p-5">
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-[#a6e3a1]/10 border border-[#a6e3a1] rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#a6e3a1] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#a6e3a1]">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-[#f38ba8]/10 border border-[#f38ba8] rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#f38ba8] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#f38ba8]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-[#89b4fa]" />
                <h2 className="text-lg font-bold text-[#cdd6f4]">Personal Information</h2>
              </div>

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
                    disabled={loading}
                    placeholder="Enter last name"
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
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
                    disabled={loading}
                    placeholder="Enter first name"
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
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
                    disabled={loading}
                    placeholder="Optional"
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-[#89b4fa]" />
                <h2 className="text-lg font-bold text-[#cdd6f4]">Change Password</h2>
              </div>
              <p className="text-sm text-[#bac2de] mb-4">
                Leave blank if you don't want to change your password
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    New Password <span className="text-[#6c7086]">(min. 6)</span>
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={loading}
                    minLength={6}
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#cdd6f4] mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    minLength={6}
                    className="w-full px-4 py-2 bg-[#1e1e2e] border border-[#45475a] rounded-lg focus:ring-2 focus:ring-[#89b4fa] focus:border-transparent text-[#cdd6f4] placeholder-[#6c7086] disabled:opacity-50"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] text-[#1e1e2e] rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1e1e2e]"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>

          {/* Read-Only Info */}
          <div className="mt-5 pt-5 border-t border-[#313244]">
            <h3 className="text-sm font-medium text-[#6c7086] mb-3">Account Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-[#6c7086]">Email:</span>
              <span className="text-[#cdd6f4]">{user?.email}</span>
              {user?.studentId && (
                <>
                  <span className="text-[#6c7086]">Student ID:</span>
                  <span className="text-[#cdd6f4]">{user.studentId}</span>
                </>
              )}
              {user?.course && (
                <>
                  <span className="text-[#6c7086]">Course:</span>
                  <span className="text-[#cdd6f4]">{user.course}</span>
                </>
              )}
              {user?.yearLevel && user?.section && (
                <>
                  <span className="text-[#6c7086]">Year & Section:</span>
                  <span className="text-[#cdd6f4]">{user.yearLevel}-{user.section}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default EditProfile;