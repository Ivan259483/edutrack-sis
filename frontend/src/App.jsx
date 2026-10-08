import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';
import StudentEnrollment from './pages/StudentEnrollment';
import StudentGrades from './pages/StudentGrades';
import StudentSchedule from './pages/StudentSchedule';
import StudentNotifications from './pages/StudentNotifications';
import StudentSupport from './pages/StudentSupport';
import AdminRedirect from './components/AdminRedirect';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Student Protected Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/enrollment"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentEnrollment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentGrades />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/schedule"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/notifications"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentNotifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/support"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentSupport />
              </ProtectedRoute>
            }
          />

          {/* Administrators use the separate admin portal */}
          <Route path="/admin/*" element={<AdminRedirect />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;