import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';

const RegisterPage = () => {
  const navigate = useNavigate();

  // Registration Steps: 1 = Details, 2 = Verify Email OTP, 3 = Success
  const [step, setStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    program: 'BS Information Technology',
    yearLevel: '1st Year',
    password: '',
    confirmPassword: '',
  });

  // Touched state for live field validation styling
  const [touched, setTouched] = useState({});

  // OTP State
  const [enteredOtp, setEnteredOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Real-time Validation Rules
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isFirstNameValid = formData.firstName.trim().length >= 2;
  const isLastNameValid = formData.lastName.trim().length >= 2;
  const isEmailValid = emailRegex.test(formData.email.trim());
  const isPasswordValid =
    formData.password.length >= 8 && /[A-Za-z]/.test(formData.password) && /\d/.test(formData.password);
  const isConfirmPasswordValid =
    formData.confirmPassword.length > 0 &&
    formData.confirmPassword === formData.password;

  const isFormValid =
    isFirstNameValid &&
    isLastNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isConfirmPasswordValid;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (serverError) setServerError('');
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Helper for border feedback
  const getFieldBorder = (fieldName, isValid) => {
    if (!touched[fieldName]) return '1px solid #475569';
    return isValid ? '1px solid #22c55e' : '1px solid #ef4444';
  };

  // STEP 1: Request OTP from backend email service
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!isFormValid) {
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        password: true,
        confirmPassword: true,
      });
      return;
    }

    setLoading(true);

    try {
      await API.post('/auth/send-otp', {
        email: formData.email.trim(),
      });

      setLoading(false);
      setStep(2);
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err) {
      setLoading(false);
      setServerError(
        err.response?.data?.message || 'Failed to send verification code. Please try again.'
      );
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setServerError('');
    setLoading(true);

    try {
      await API.post('/auth/send-otp', {
        email: formData.email.trim(),
      });
      setLoading(false);
      setResendCooldown(60);
    } catch (err) {
      setLoading(false);
      setServerError(
        err.response?.data?.message || 'Failed to resend code. Please try again.'
      );
    }
  };

  // STEP 2: Verify OTP & Register Account
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setServerError('');

    if (enteredOtp.trim().length !== 5) {
      setServerError('Please enter the full 5-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      // 1. Verify OTP with backend
      await API.post('/auth/verify-otp', {
        email: formData.email.trim(),
        otp: enteredOtp.trim(),
      });

      // 2. Complete Registration
      await API.post('/auth/register', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        program: formData.program,
        yearLevel: formData.yearLevel,
      });

      setLoading(false);
      setStep(3);
    } catch (err) {
      setLoading(false);
      setServerError(
        err.response?.data?.message || 'Verification or registration failed. Please try again.'
      );
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-5"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className="container" style={{ maxWidth: '520px' }}>
        <div
          className="card shadow-lg border-0 text-white rounded-4"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div className="card-body p-4 p-sm-5">
            {/* Header */}
            <div className="text-center mb-4">
              <h4 className="fw-bold text-white mb-1">Student Account Registration</h4>
              <p className="text-secondary small mb-0">EduTrack Student Information System</p>
            </div>

            {/* Step Progress Indicators */}
            <div className="d-flex justify-content-center align-items-center mb-4 gap-2">
              <div
                className="rounded-pill"
                style={{
                  width: '32px',
                  height: '4px',
                  backgroundColor: step >= 1 ? '#2563eb' : '#475569',
                }}
              />
              <div
                className="rounded-pill"
                style={{
                  width: '32px',
                  height: '4px',
                  backgroundColor: step >= 2 ? '#2563eb' : '#475569',
                }}
              />
              <div
                className="rounded-pill"
                style={{
                  width: '32px',
                  height: '4px',
                  backgroundColor: step >= 3 ? '#22c55e' : '#475569',
                }}
              />
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div
                className="alert alert-danger py-2 small mb-3 border-0 rounded-3 text-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
              >
                {serverError}
              </div>
            )}

            {/* STEP 1: Registration Form with Real-time Validation */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} noValidate>
                {/* Name Fields */}
                <div className="row g-2 mb-3">
                  <div className="col-sm-6">
                    <label className="form-label text-light small fw-medium">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      className="form-control bg-dark text-white py-2"
                      style={{ border: getFieldBorder('firstName', isFirstNameValid) }}
                      placeholder="e.g. Gabriel"
                      value={formData.firstName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                    {touched.firstName && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isFirstNameValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isFirstNameValid ? 'Valid first name' : 'Minimum 2 characters required'}
                      </span>
                    )}
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label text-light small fw-medium">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      className="form-control bg-dark text-white py-2"
                      style={{ border: getFieldBorder('lastName', isLastNameValid) }}
                      placeholder="e.g. Adiaton"
                      value={formData.lastName}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                    {touched.lastName && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isLastNameValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isLastNameValid ? 'Valid last name' : 'Minimum 2 characters required'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Degree Program & Year Level */}
                <div className="row g-2 mb-3">
                  <div className="col-sm-7">
                    <label className="form-label text-light small fw-medium">Degree Program</label>
                    <select
                      name="program"
                      className="form-select bg-dark border-secondary text-white py-2"
                      value={formData.program}
                      onChange={handleChange}
                    >
                      <option value="BS Information Technology">BS Information Technology</option>
                      <option value="BS Business Administration">BS Business Administration</option>
                      <option value="Bachelor of Secondary Education">Bachelor of Secondary Education</option>
                    </select>
                  </div>

                  <div className="col-sm-5">
                    <label className="form-label text-light small fw-medium">Year Level</label>
                    <select
                      name="yearLevel"
                      className="form-select bg-dark border-secondary text-white py-2"
                      value={formData.yearLevel}
                      onChange={handleChange}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                {/* Email Address */}
                <div className="mb-3">
                  <label className="form-label text-light small fw-medium">
                    Email Address <span className="text-secondary">(Gmail or institutional)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="form-control bg-dark text-white py-2"
                    style={{ border: getFieldBorder('email', isEmailValid) }}
                    placeholder="e.g. student@gmail.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  {touched.email && (
                    <span
                      className="small d-block mt-1"
                      style={{ fontSize: '11px', color: isEmailValid ? '#22c55e' : '#ef4444' }}
                    >
                      {isEmailValid ? 'Valid email format' : 'Please enter a valid email address'}
                    </span>
                  )}
                </div>

                {/* Password Fields */}
                <div className="row g-2 mb-4">
                  <div className="col-sm-6">
                    <label className="form-label text-light small fw-medium">Password</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control bg-dark text-white py-2"
                      style={{ border: getFieldBorder('password', isPasswordValid) }}
                      placeholder="Min 8 characters, letters & numbers"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                    {touched.password && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isPasswordValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isPasswordValid ? 'Password meets requirements' : 'At least 8 characters with a letter and a number'}
                      </span>
                    )}
                  </div>

                  <div className="col-sm-6">
                    <label className="form-label text-light small fw-medium">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-control bg-dark text-white py-2"
                      style={{ border: getFieldBorder('confirmPassword', isConfirmPasswordValid) }}
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      required
                    />
                    {touched.confirmPassword && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isConfirmPasswordValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isConfirmPasswordValid ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3"
                  disabled={loading || !isFormValid}
                  style={{
                    backgroundColor: isFormValid ? '#2563eb' : '#334155',
                    borderColor: isFormValid ? '#2563eb' : '#334155',
                    cursor: isFormValid ? 'pointer' : 'not-allowed',
                  }}
                >
                  {loading ? 'Sending Verification Code...' : 'Send Verification Code to Email'}
                </button>

                <div className="text-center">
                  <span className="text-secondary small">Already have an account? </span>
                  <Link to="/login" className="text-primary small text-decoration-none fw-semibold">
                    Sign In
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 2: Email Verification Code Entry */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtpAndRegister}>
                <div className="text-center mb-4">
                  <h5 className="fw-bold text-white mb-2">Check Your Email</h5>
                  <p className="text-secondary small mb-2">
                    A 5-digit verification code has been dispatched to:
                  </p>
                  <div
                    className="p-2 rounded-3 text-white fw-semibold small d-inline-block"
                    style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                  >
                    {formData.email}
                  </div>
                  <p className="text-secondary small mt-2" style={{ fontSize: '12px' }}>
                    Please check your Gmail inbox or spam/junk folder. The code will expire in 5 minutes.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="form-label text-light small text-center d-block fw-medium">
                    Enter 5-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength="5"
                    className="form-control bg-dark border-secondary text-white text-center fs-3 font-monospace py-2"
                    style={{ letterSpacing: '8px' }}
                    placeholder="00000"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3"
                  disabled={loading || enteredOtp.length !== 5}
                >
                  {loading ? 'Verifying & Registering...' : 'Verify Code & Complete Registration'}
                </button>

                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-secondary border-opacity-25">
                  <button
                    type="button"
                    className="btn btn-link text-secondary text-decoration-none small p-0"
                    onClick={() => {
                      setStep(1);
                      setEnteredOtp('');
                      setServerError('');
                    }}
                  >
                    Change Email
                  </button>

                  <button
                    type="button"
                    className="btn btn-link text-primary text-decoration-none small fw-semibold p-0"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    style={{ opacity: resendCooldown > 0 ? 0.6 : 1 }}
                  >
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Registration Success Confirmation */}
            {step === 3 && (
              <div className="text-center py-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: '64px', height: '64px', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <h5 className="fw-bold text-white mb-2">Account Registered Successfully</h5>
                <p className="text-secondary small mb-4">
                  Your student account for <strong className="text-white">{formData.email}</strong> has been verified and registered. You may now sign in using your email address and password.
                </p>

                <button
                  type="button"
                  className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;