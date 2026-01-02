import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import AutoLogoutWrapper from './components/AutoLogoutWrapper';
import ErrorBoundary from './components/ErrorBoundary';

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#89b4fa] mx-auto mb-4"></div>
      <p className="text-[#6c7086] text-sm">Loading...</p>
    </div>
  </div>
);

// Auth pages (not lazy loaded for fast initial load)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Student pages (lazy loaded)
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const MyProgress = lazy(() => import('./pages/MyProgress'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const StudentSessionActivities = lazy(() => import('./pages/StudentSessionActivities'));
const SandboxPage = lazy(() => import('./pages/SandboxPage'));
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'));

// Instructor pages (lazy loaded)
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const LabSessionsPage = lazy(() => import('./pages/LabSessionsPage'));
const LabSessionDetailPage = lazy(() => import('./pages/LabSessionDetailPage'));
const CreateEditLabSession = lazy(() => import('./pages/CreateEditLabSession'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <AutoLogoutWrapper>
            <Router>
              <Suspense fallback={<PageLoader />}>
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

          <Route
            path="/student/twin"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DigitalTwinPage />
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
              </Suspense>
            </Router>
          </AutoLogoutWrapper>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
