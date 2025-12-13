import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';

// Student pages
import StudentDashboard from './pages/StudentDashboard';
import ActivityPage from './pages/ActivityPage';
import MyProgress from './pages/MyProgress';
import EditProfile from './pages/EditProfile';

// Instructor pages
import InstructorDashboard from './pages/InstructorDashboard';
import LabSessionsPage from './pages/LabSessionsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* ---------- Public ---------- */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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

          {/* Placeholder routes (Phase 1.5 / Phase 2) */}
          <Route
            path="/instructor/lab-sessions/create"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <div className="p-8 text-[#cdd6f4]">Create Lab Session (Coming Next)</div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/lab-sessions/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <div className="p-8 text-[#cdd6f4]">Edit Lab Session (Coming Next)</div>
              </ProtectedRoute>
            }
          />

          <Route
            path="/instructor/lab-sessions/:id"
            element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <div className="p-8 text-[#cdd6f4]">Lab Session Details (Coming Next)</div>
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
    </AuthProvider>
  );
}

export default App;
