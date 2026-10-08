import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaLock, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div className="container" style={{ maxWidth: '440px' }}>
        <div
          className="card shadow-lg border-0 text-white rounded-4"
          style={{ backgroundColor: '#1e293b' }}
        >
          <div className="card-body p-4 p-sm-5">
            {/* Header Branding */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary bg-opacity-25 text-primary mb-3"
                style={{ width: '60px', height: '60px', fontSize: '24px' }}
              >
                <FaLock />
              </div>
              <h3 className="fw-bold text-white mb-1">Forgot Password</h3>
              <p className="text-secondary small mb-0">
                Enter your details to receive password recovery instructions
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-3">
                <div className="text-success mb-3" style={{ fontSize: '48px' }}>
                  <FaCheckCircle />
                </div>
                <h5 className="fw-bold text-white mb-2">Reset Link Sent</h5>
                <p className="text-secondary small mb-4">
                  If an account exists for <strong>{identifier}</strong>, you will receive password reset instructions in your inbox shortly.
                </p>
                <Link to="/login" className="btn btn-primary w-100 py-2 rounded-3 fw-semibold">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label text-light small fw-medium">
                    Student ID or Registered Email
                  </label>
                  <input
                    type="text"
                    className="form-control bg-dark border-secondary text-white py-2"
                    placeholder="e.g. 2026-00124 or name@gmail.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold rounded-3 shadow-sm mb-3"
                  disabled={loading}
                >
                  {loading ? 'Searching account...' : 'Send Recovery Instructions'}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-secondary text-decoration-none small d-inline-flex align-items-center gap-1"
                  >
                    <FaArrowLeft style={{ fontSize: '11px' }} /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;