import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaGraduationCap, FaKey, FaShieldAlt } from 'react-icons/fa';
import FieldError from '../components/form/FieldError';
import PasswordChecklist from '../components/form/PasswordChecklist';
import API, { errorMessage } from '../services/api';
import {
  apiFieldErrors,
  confirmPassword,
  digitsCode,
  email as emailRule,
  onlyErrors,
  RESEND_SECONDS,
  RESET_CODE_LENGTH,
  strongPassword,
} from '../services/validation';

const inputClass = 'form-control bg-dark border-secondary text-white py-2';
const SENT_MESSAGE = 'If an account matches, we sent a code to its email.';

// Forgot password for both tabs of the login page:
// step 1 asks for the email/Student ID, step 2 for the emailed code and the new password.
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') === 'admin' ? 'admin' : 'student');
  const [step, setStep] = useState(1);

  const [identifier, setIdentifier] = useState('');
  const [form, setForm] = useState({ code: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const identifierError = (value = identifier) => {
    if (role === 'admin') return emailRule(value, 'Administrator email');
    return value.trim() ? '' : 'Enter your email or Student ID.';
  };
  const resetErrors = (values = form) =>
    onlyErrors({
      code: digitsCode(values.code, RESET_CODE_LENGTH),
      password: strongPassword(values.password),
      confirmPassword: confirmPassword(values.confirmPassword, values.password),
    });
  const checkField = (name) =>
    setFieldErrors((prev) => ({
      ...prev,
      [name]: name === 'identifier' ? identifierError() : resetErrors()[name] || '',
    }));
  const clearField = (name) => fieldErrors[name] && setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  const border = (name) => ({ borderColor: fieldErrors[name] ? '#ef4444' : undefined });

  // Runs one request at a time (no double submits).
  const once = async (work) => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await work();
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const requestCode = () =>
    once(async () => {
      try {
        const { data } = await API.post('/auth/forgot-password', { identifier: identifier.trim(), role });
        setInfo(data.message || SENT_MESSAGE);
        setCooldown(data.retryAfter || RESEND_SECONDS);
        setStep(2);
      } catch (err) {
        const retryAfter = err.response?.data?.retryAfter;
        if (retryAfter) setCooldown(retryAfter);
        setFieldErrors(apiFieldErrors(err));
        if (!err.response?.data?.errors) setError(errorMessage(err));
      }
    });

  const handleRequest = (e) => {
    e.preventDefault();
    const message = identifierError();
    setFieldErrors({ identifier: message });
    if (!message) requestCode();
  };

  const handleReset = (e) => {
    e.preventDefault();
    const errors = resetErrors();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    once(async () => {
      try {
        await API.post('/auth/reset-password', {
          identifier: identifier.trim(),
          role,
          code: form.code.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        navigate(`/login?role=${role}`, {
          replace: true,
          state: { notice: 'Your password has been reset. Sign in with your new password.' },
        });
      } catch (err) {
        const errors = apiFieldErrors(err);
        setFieldErrors(errors);
        if (!Object.keys(errors).length) setError(errorMessage(err));
      }
    });
  };

  const switchRole = (next) => {
    setRole(next);
    setFieldErrors({});
    setError('');
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 py-5" style={{ backgroundColor: '#0f172a' }}>
      <div className="container" style={{ maxWidth: '460px' }}>
        <div className="card shadow-lg border-0 text-white rounded-4" style={{ backgroundColor: '#1e293b' }}>
          <div className="card-body p-4 p-sm-5">
            {/* Header */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-25 text-primary mb-3"
                style={{ width: '56px', height: '56px', fontSize: '22px' }}
              >
                <FaKey />
              </div>
              <h4 className="fw-bold text-white mb-1">Reset Your Password</h4>
              <p className="text-secondary small mb-0">
                {step === 1
                  ? 'Enter your account and we will email you a 6-digit code.'
                  : 'Enter the code from your email and choose a new password.'}
              </p>
            </div>

            {/* Role Switcher Tabs (step 1 only) */}
            {step === 1 && (
              <div className="d-flex p-1 rounded-3 mb-4" style={{ backgroundColor: '#0f172a' }}>
                {[
                  ['student', <FaGraduationCap key="i" />, 'Student'],
                  ['admin', <FaShieldAlt key="i" />, 'Administrator'],
                ].map(([value, icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn flex-fill py-2 rounded-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0 ${
                      role === value ? 'btn-primary text-white shadow-sm' : 'text-secondary bg-transparent'
                    }`}
                    onClick={() => switchRole(value)}
                    aria-pressed={role === value}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div
                className="alert alert-danger py-2 small mb-3 border-0 rounded-3 text-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                role="alert"
              >
                {error}
              </div>
            )}

            {/* STEP 1: Email or Student ID */}
            {step === 1 && (
              <form onSubmit={handleRequest} noValidate>
                <div className="mb-4">
                  <label className="form-label text-light small fw-medium" htmlFor="forgot-identifier">
                    {role === 'student' ? 'Student Email or Student ID' : 'Administrator Email'}
                  </label>
                  <input
                    id="forgot-identifier"
                    type={role === 'student' ? 'text' : 'email'}
                    autoComplete="username"
                    className={inputClass}
                    style={border('identifier')}
                    placeholder={role === 'student' ? 'e.g. juan.delacruz@edutrack.edu' : 'e.g. admin@edutrack.edu'}
                    value={identifier}
                    maxLength={254}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      clearField('identifier');
                    }}
                    onBlur={() => checkField('identifier')}
                    aria-invalid={Boolean(fieldErrors.identifier)}
                    aria-describedby={fieldErrors.identifier ? 'forgot-identifier-error' : undefined}
                    autoFocus
                  />
                  <FieldError id="forgot-identifier-error" message={fieldErrors.identifier} />
                </div>

                <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3" disabled={loading}>
                  {loading ? 'Sending Code...' : 'Send Reset Code'}
                </button>
              </form>
            )}

            {/* STEP 2: Code + new password */}
            {step === 2 && (
              <form onSubmit={handleReset} noValidate>
                {info && (
                  <div
                    className="alert py-2 small mb-3 border-0 rounded-3 text-center"
                    style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#93c5fd' }}
                    role="status"
                  >
                    {info} It is valid for 15 minutes.
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label text-light small fw-medium" htmlFor="reset-code">
                    6-Digit Reset Code
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={RESET_CODE_LENGTH}
                    className={`${inputClass} text-center fs-4 font-monospace`}
                    style={{ letterSpacing: '8px', ...border('code') }}
                    placeholder="000000"
                    value={form.code}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, code: e.target.value.replace(/\D/g, '') }));
                      clearField('code');
                    }}
                    onBlur={() => checkField('code')}
                    aria-invalid={Boolean(fieldErrors.code)}
                    aria-describedby={fieldErrors.code ? 'reset-code-error' : undefined}
                    autoFocus
                  />
                  <FieldError id="reset-code-error" message={fieldErrors.code} />
                </div>

                <div className="mb-3">
                  <label className="form-label text-light small fw-medium" htmlFor="reset-password">
                    New Password
                  </label>
                  <div className="input-group">
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={inputClass}
                      style={border('password')}
                      placeholder="Create a strong password"
                      value={form.password}
                      maxLength={128}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, password: e.target.value }));
                        clearField('password');
                      }}
                      onBlur={() => checkField('password')}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby="reset-password-rules"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-light border-secondary d-flex align-items-center"
                      style={{ color: '#cbd5e1' }}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <FaEyeSlash size={16} aria-hidden="true" /> : <FaEye size={16} aria-hidden="true" />}
                    </button>
                  </div>
                  <FieldError message={fieldErrors.password} />
                  <PasswordChecklist id="reset-password-rules" password={form.password} dark />
                </div>

                <div className="mb-4">
                  <label className="form-label text-light small fw-medium" htmlFor="reset-confirm">
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={inputClass}
                    style={border('confirmPassword')}
                    placeholder="Re-enter the new password"
                    value={form.confirmPassword}
                    maxLength={128}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, confirmPassword: e.target.value }));
                      clearField('confirmPassword');
                    }}
                    onBlur={() => checkField('confirmPassword')}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={fieldErrors.confirmPassword ? 'reset-confirm-error' : undefined}
                  />
                  <FieldError id="reset-confirm-error" message={fieldErrors.confirmPassword} />
                </div>

                <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3" disabled={loading}>
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25">
                  <button
                    type="button"
                    className="btn btn-link text-secondary text-decoration-none small p-0"
                    onClick={() => {
                      setStep(1);
                      setForm({ code: '', password: '', confirmPassword: '' });
                      setFieldErrors({});
                      setError('');
                    }}
                  >
                    {role === 'student' ? 'Use a different email or ID' : 'Use a different email'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-link text-primary text-decoration-none small fw-semibold p-0"
                    disabled={cooldown > 0 || loading}
                    onClick={requestCode}
                    style={{ opacity: cooldown > 0 ? 0.6 : 1 }}
                  >
                    {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center mt-3 pt-3 border-top border-secondary border-opacity-25 small">
              <span className="text-secondary">Remembered it? </span>
              <Link to={`/login?role=${role}`} className="text-primary text-decoration-none fw-semibold">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
