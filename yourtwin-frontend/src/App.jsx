import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AutoLogoutWrapper from './components/AutoLogoutWrapper';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Student pages
import StudentDashboard from './pages/StudentDashboard';
import ActivityPage from './pages/ActivityPage';
import MyProgress from './pages/MyProgress';
import EditProfile from './pages/EditProfile';
import StudentSessionActivities from './pages/StudentSessionActivities';
import SandboxPage from './pages/SandboxPage';

// Instructor pages
import InstructorDashboard from './pages/InstructorDashboard';
import LabSessionsPage from './pages/LabSessionsPage';
import LabSessionDetailPage from './pages/LabSessionDetailPage';
import CreateEditLabSession from './pages/CreateEditLabSession';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AutoLogoutWrapper>
          <Router>
            <Routes>

          {/* ---------- Public ---------- */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* ---------- Student Routes ---------- */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/activity/:activityId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ActivityPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/progress"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyProgress />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/profile/edit"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/session/:sessionId"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentSessionActivities />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/sandbox"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <SandboxPage />
              </ProtectedRoute>
            }
          />

          {/* ---------- Instructor Routes ---------- */}
          <Route
            path="/instructor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/profile/edit"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/lab-sessions"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <LabSessionsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/lab-sessions/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <CreateEditLabSession />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/lab-sessions/:sessionId/edit"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <CreateEditLabSession />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/lab-sessions/:sessionId"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <LabSessionDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/analytics"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />

          {/* ---------- Unauthorized ---------- */}
          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-red-600 mb-4">Unauthorized</h1>
                  <p className="text-gray-600 mb-4">
                    You don't have permission to access this page.
                  </p>
                  <a href="/login" className="text-mmsu-blue hover:underline">
                    Return to Login
                  </a>
                </div>
              </div>
            }
          />

          {/* ---------- 404 ---------- */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-800 mb-4">
                    404 - Page Not Found
                  </h1>
                  <a href="/login" className="text-mmsu-blue hover:underline">
                    Return to Login
                  </a>
                </div>
              </div>
            }
          />

            </Routes>
          </Router>
        </AutoLogoutWrapper>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
