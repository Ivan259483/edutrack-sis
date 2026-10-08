import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaGraduationCap, FaShieldAlt, FaEye, FaEyeSlash, FaBolt, FaLock } from 'react-icons/fa';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);

  // Form State: 'student' or 'admin'
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Status State
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect immediately to the student portal
  useEffect(() => {
    if (user?.role === 'student') {
      navigate('/student/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email.trim(), password, role);

    if (!result.success) {
      setLoading(false);
      setError(result.message);
    } else if (result.user.role === 'student') {
      navigate('/student/dashboard', { replace: true });
    }
    // Administrators are being redirected to the admin portal.
  };

  // Quick Demo Buttons (Email Only)
  const handleFillDemoStudent = () => {
    setRole('student');
    setEmail('juan.delacruz@edutrack.edu');
    setPassword('Student123!');
    setError('');
  };

  const handleFillDemoAdmin = () => {
    setRole('admin');
    setEmail('admin@edutrack.edu');
    setPassword('Admin123!');
    setError('');
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className="container" style={{ maxWidth: '460px' }}>
        {/* Main Card */}
        <div
          className="card shadow-lg border-0 text-white rounded-4"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div className="card-body p-4 p-sm-5">
            {/* Header Branding */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-25 text-primary mb-3"
                style={{ width: '56px', height: '56px', fontSize: '24px' }}
              >
                <FaGraduationCap />
              </div>
              <h4 className="fw-bold text-white mb-1">EduTrack SIS</h4>
              <p className="text-secondary small mb-0">Student Information & Management Portal</p>
            </div>

            {/* Role Switcher Tabs */}
            <div
              className="d-flex p-1 rounded-3 mb-4"
              style={{ backgroundColor: '#0f172a' }}
            >
              <button
                type="button"
                className={`btn flex-fill py-2 rounded-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0 ${
                  role === 'student'
                    ? 'btn-primary text-white shadow-sm'
                    : 'text-secondary bg-transparent'
                }`}
                onClick={() => {
                  setRole('student');
                  setError('');
                }}
              >
                <FaGraduationCap /> Student
              </button>
              <button
                type="button"
                className={`btn flex-fill py-2 rounded-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0 ${
                  role === 'admin'
                    ? 'btn-primary text-white shadow-sm'
                    : 'text-secondary bg-transparent'
                }`}
                onClick={() => {
                  setRole('admin');
                  setError('');
                }}
              >
                <FaShieldAlt /> Administrator
              </button>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                className="alert alert-danger py-2 small mb-3 border-0 rounded-3 text-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email Input (No Student ID) */}
              <div className="mb-3">
                <label className="form-label text-light small fw-medium">
                  {role === 'student' ? 'Student Email or Student ID' : 'Administrator Email'}
                </label>
                <input
                  type={role === 'student' ? 'text' : 'email'}
                  autoComplete="username"
                  className="form-control bg-dark border-secondary text-white py-2"
                  placeholder={role === 'student' ? 'e.g. juan.delacruz@edutrack.edu' : 'e.g. admin@edutrack.edu'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="mb-3">
                <label className="form-label text-light small fw-medium">Password</label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control bg-dark border-secondary text-white py-2"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-secondary text-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="d-flex justify-content-between align-items-center mb-4 small">
                <div className="form-check">
                  <input
                    className="form-check-input bg-dark border-secondary"
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label text-secondary" htmlFor="rememberMe">
                    Remember Me
                  </label>
                </div>
                <Link to="/forgot-password" className="text-primary text-decoration-none small">
                  Forgot Password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            {/* Bottom Registration Area: ONLY visible when Student tab is selected */}
            {role === 'student' && (
              <div className="text-center mt-3 pt-3 border-top border-secondary border-opacity-25 small">
                <span className="text-secondary">New student? </span>
                <Link to="/register" className="text-primary text-decoration-none fw-semibold">
                  Create an Account
                </Link>
              </div>
            )}

            {/* When Admin tab is active, show only the security note */}
            {role === 'admin' && (
              <div className="text-center mt-3 pt-3 border-top border-secondary border-opacity-25 small">
                <span className="text-secondary d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '11px' }}>
                  <FaLock style={{ fontSize: '10px' }} /> Authorized Registrar Personnel Only
                </span>
              </div>
            )}

            {/* Quick Demo Helper Section */}
            <div
              className="p-3 rounded-3 mt-4 border border-secondary border-opacity-25"
              style={{ backgroundColor: '#0f172a' }}
            >
              <div className="d-flex align-items-center gap-1 text-warning small fw-bold mb-2">
                <FaBolt /> Quick Demo Fill
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light flex-fill py-1 small d-flex align-items-center justify-content-center gap-1"
                  onClick={handleFillDemoStudent}
                >
                  <FaGraduationCap /> Demo Student
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light flex-fill py-1 small d-flex align-items-center justify-content-center gap-1"
                  onClick={handleFillDemoAdmin}
                >
                  <FaShieldAlt /> Demo Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;