import { useState } from 'react';
import { FaKey } from 'react-icons/fa';
import API, { errorMessage } from '../services/api';

// Lets a signed-in user change their password (PUT /api/auth/password).
const ChangePassword = () => {
  const [form, setForm] = useState({ currentPassword: '', password: '', confirm: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  const update = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      return setStatus({ type: 'danger', message: 'Use at least 8 characters with a letter and a number.' });
    }
    if (form.password !== form.confirm) {
      return setStatus({ type: 'danger', message: 'New passwords do not match.' });
    }
    setSaving(true);
    try {
      await API.put('/auth/password', { currentPassword: form.currentPassword, password: form.password });
      setForm({ currentPassword: '', password: '', confirm: '' });
      setStatus({ type: 'success', message: 'Your password has been updated.' });
    } catch (err) {
      setStatus({ type: 'danger', message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="security" className="card border-0 shadow-sm rounded-4 p-4 bg-white mt-4">
      <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
        <span className="text-primary fs-5"><FaKey /></span>
        <h6 className="fw-bold text-dark mb-0">Account Security</h6>
      </div>
      {status.message && (
        <div className={`alert alert-${status.type} py-2 small`} role="alert">
          {status.message}
        </div>
      )}
      <form className="row g-3" onSubmit={handleSubmit} noValidate>
        <div className="col-md-4">
          <label className="form-label small text-muted" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className="form-control" value={form.currentPassword} onChange={update} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small text-muted" htmlFor="newPassword">New password</label>
          <input id="newPassword" name="password" type="password" autoComplete="new-password" className="form-control" value={form.password} onChange={update} required />
        </div>
        <div className="col-md-4">
          <label className="form-label small text-muted" htmlFor="confirmPassword">Confirm new password</label>
          <input id="confirmPassword" name="confirm" type="password" autoComplete="new-password" className="form-control" value={form.confirm} onChange={update} required />
        </div>
        <div className="col-12">
          <button type="submit" className="btn btn-primary btn-sm px-3" disabled={saving || !form.currentPassword}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
