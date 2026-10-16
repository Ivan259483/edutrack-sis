import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FieldError from '../components/form/FieldError';
import PasswordChecklist from '../components/form/PasswordChecklist';
import API, { errorMessage } from '../services/api';
import {
  apiFieldErrors,
  clean,
  confirmPassword,
  digitsCode,
  email as emailRule,
  onlyErrors,
  personName,
  REGISTRATION_CODE_LENGTH,
  RESEND_SECONDS,
  strongPassword,
} from '../services/validation';

const DETAIL_FIELDS = ['firstName', 'lastName', 'email', 'password', 'confirmPassword', 'program', 'yearLevel'];

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
  const [otpTouched, setOtpTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  // Field messages returned by the API (e.g. "Email is already registered.").
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const submitting = useRef(false);

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

  // Real-time Validation Rules (the API enforces the same ones)
  const errors = {
    ...onlyErrors({
      firstName: personName(formData.firstName, 'First name'),
      lastName: personName(formData.lastName, 'Last name'),
      email: emailRule(formData.email),
      password: strongPassword(formData.password),
      confirmPassword: confirmPassword(formData.confirmPassword, formData.password),
    }),
    ...onlyErrors(serverFieldErrors),
  };
  const isFirstNameValid = !errors.firstName;
  const isLastNameValid = !errors.lastName;
  const isEmailValid = !errors.email;
  const isPasswordValid = !errors.password;
  const isConfirmPasswordValid = !errors.confirmPassword;
  const isFormValid = DETAIL_FIELDS.every((field) => !errors[field]);
  const otpError = serverFieldErrors.otp || digitsCode(enteredOtp, REGISTRATION_CODE_LENGTH);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (serverFieldErrors[name]) setServerFieldErrors((prev) => ({ ...prev, [name]: '' }));
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

  // One request at a time (no double submits).
  const once = async (work) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setServerError('');
    try {
      await work();
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  // Shows API field errors under their fields (back on step 1 if they belong there).
  const showApiError = (err, fallback) => {
    const fieldErrors = apiFieldErrors(err);
    if (!Object.keys(fieldErrors).length) {
      setServerError(errorMessage(err, fallback));
      return;
    }
    setServerFieldErrors(fieldErrors);
    if (DETAIL_FIELDS.some((field) => fieldErrors[field])) {
      setTouched(Object.fromEntries(DETAIL_FIELDS.map((field) => [field, true])));
      setStep(1);
    } else {
      setOtpTouched(true);
    }
  };

  const email = () => formData.email.trim().toLowerCase();

  // STEP 1: Request OTP from backend email service
  const handleSendOtp = (e) => {
    e.preventDefault();
    setServerError('');

    if (!isFormValid) {
      setTouched(Object.fromEntries(DETAIL_FIELDS.map((field) => [field, true])));
      return;
    }

    once(async () => {
      try {
        await API.post('/auth/send-otp', { email: email() });
        setStep(2);
        setResendCooldown(RESEND_SECONDS);
      } catch (err) {
        showApiError(err, 'Failed to send verification code. Please try again.');
      }
    });
  };

  // Resend OTP handler
  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    once(async () => {
      try {
        await API.post('/auth/send-otp', { email: email() });
        setResendCooldown(RESEND_SECONDS);
        setServerFieldErrors({});
      } catch (err) {
        showApiError(err, 'Failed to resend code. Please try again.');
      }
    });
  };

  // STEP 2: Verify OTP & Register Account
  const handleVerifyOtpAndRegister = (e) => {
    e.preventDefault();
    setServerError('');
    setOtpTouched(true);
    if (otpError) return;

    once(async () => {
      try {
        // 1. Verify OTP with backend
        await API.post('/auth/verify-otp', { email: email(), otp: enteredOtp.trim() });

        // 2. Complete Registration
        await API.post('/auth/register', {
          firstName: clean(formData.firstName),
          lastName: clean(formData.lastName),
          email: email(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          program: formData.program,
          yearLevel: formData.yearLevel,
        });

        setStep(3);
      } catch (err) {
        showApiError(err, 'Verification or registration failed. Please try again.');
      }
    });
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
                      maxLength={50}
                      autoComplete="given-name"
                      aria-invalid={Boolean(touched.firstName && errors.firstName)}
                      required
                    />
                    {touched.firstName && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isFirstNameValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isFirstNameValid ? 'Valid first name' : errors.firstName}
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
                      maxLength={50}
                      autoComplete="family-name"
                      aria-invalid={Boolean(touched.lastName && errors.lastName)}
                      required
                    />
                    {touched.lastName && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isLastNameValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isLastNameValid ? 'Valid last name' : errors.lastName}
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
                    maxLength={254}
                    autoComplete="email"
                    aria-invalid={Boolean(touched.email && errors.email)}
                    required
                  />
                  {touched.email && (
                    <span
                      className="small d-block mt-1"
                      style={{ fontSize: '11px', color: isEmailValid ? '#22c55e' : '#ef4444' }}
                    >
                      {isEmailValid ? 'Valid email format' : errors.email}
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
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      maxLength={128}
                      autoComplete="new-password"
                      aria-invalid={Boolean(touched.password && errors.password)}
                      aria-describedby="register-password-rules"
                      required
                    />
                    {touched.password && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isPasswordValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isPasswordValid ? 'Password meets requirements' : 'Password does not meet all requirements'}
                      </span>
                    )}
                    <PasswordChecklist id="register-password-rules" password={formData.password} dark />
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
                      maxLength={128}
                      autoComplete="new-password"
                      aria-invalid={Boolean(touched.confirmPassword && errors.confirmPassword)}
                      required
                    />
                    {touched.confirmPassword && (
                      <span
                        className="small d-block mt-1"
                        style={{ fontSize: '11px', color: isConfirmPasswordValid ? '#22c55e' : '#ef4444' }}
                      >
                        {isConfirmPasswordValid ? 'Passwords match' : errors.confirmPassword}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3"
                  disabled={loading}
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
              <form onSubmit={handleVerifyOtpAndRegister} noValidate>
                <div className="text-center mb-4">
                  <h5 className="fw-bold text-white mb-2">Check Your Email</h5>
                  <p className="text-secondary small mb-2">
                    A {REGISTRATION_CODE_LENGTH}-digit verification code has been dispatched to:
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
                  <label className="form-label text-light small text-center d-block fw-medium" htmlFor="register-otp">
                    Enter {REGISTRATION_CODE_LENGTH}-Digit Verification Code
                  </label>
                  <input
                    id="register-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={REGISTRATION_CODE_LENGTH}
                    className="form-control bg-dark border-secondary text-white text-center fs-3 font-monospace py-2"
                    style={{ letterSpacing: '8px', borderColor: otpTouched && otpError ? '#ef4444' : undefined }}
                    placeholder={'0'.repeat(REGISTRATION_CODE_LENGTH)}
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value.replace(/\D/g, ''));
                      if (serverFieldErrors.otp) setServerFieldErrors((prev) => ({ ...prev, otp: '' }));
                    }}
                    onBlur={() => setOtpTouched(true)}
                    aria-invalid={Boolean(otpTouched && otpError)}
                    aria-describedby={otpTouched && otpError ? 'register-otp-error' : undefined}
                    required
                    autoFocus
                  />
                  <div className="text-center">
                    <FieldError id="register-otp-error" message={otpTouched ? otpError : ''} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3"
                  disabled={loading}
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
                      setOtpTouched(false);
                      setServerError('');
                      setServerFieldErrors({});
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