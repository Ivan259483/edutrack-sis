import { useContext, useRef, useState } from 'react';
import { FaKey } from 'react-icons/fa';
import { AuthContext } from '../context/auth-context';
import API, { errorMessage } from '../services/api';
import PasswordChecklist from './form/PasswordChecklist';
import { apiFieldErrors, confirmPassword, onlyErrors, strongPassword } from '../services/validation';

const EMPTY = { currentPassword: '', password: '', confirm: '' };

// Lets a signed-in user change their password (PUT /api/auth/password).
const ChangePassword = () => {
  const { replaceToken } = useContext(AuthContext);
  const [form, setForm] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const errors = {
    ...onlyErrors({
      currentPassword: form.currentPassword ? '' : 'Enter your current password.',
      password: strongPassword(form.password),
      confirm: confirmPassword(form.confirm, form.password),
    }),
    ...onlyErrors(serverErrors),
  };
  const shown = (name) => (touched[name] ? errors[name] : '');

  const update = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: '' }));
  };
  const blur = (e) => setTouched((prev) => ({ ...prev, [e.target.name]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    setTouched({ currentPassword: true, password: true, confirm: true });
    setStatus({ type: '', message: '' });
    if (Object.keys(errors).length) return;
    submitting.current = true;
    setSaving(true);
    try {
      const { data } = await API.put('/auth/password', {
        currentPassword: form.currentPassword,
        password: form.password,
        confirmPassword: form.confirm,
      });
      // Other sessions are signed out; this one continues with the new token.
      if (data.token) replaceToken(data.token);
      setForm(EMPTY);
      setTouched({});
      setStatus({ type: 'success', message: 'Your password has been updated.' });
    } catch (err) {
      const fieldErrors = apiFieldErrors(err);
      if (fieldErrors.confirmPassword) fieldErrors.confirm = fieldErrors.confirmPassword;
      setServerErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setStatus({ type: 'danger', message: errorMessage(err) });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  const field = (name, id, label, autoComplete, extra = null) => (
    <div className="col-md-4">
      <label className="form-label small text-muted" htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        className={`form-control ${shown(name) ? 'is-invalid' : ''}`}
        value={form[name]}
        maxLength={128}
        onChange={update}
        onBlur={blur}
        aria-invalid={Boolean(shown(name))}
        aria-describedby={shown(name) ? `${id}-error` : undefined}
        required
      />
      {shown(name) && (
        <div id={`${id}-error`} className="invalid-feedback">
          {shown(name)}
        </div>
      )}
      {extra}
    </div>
  );

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
        {field('currentPassword', 'currentPassword', 'Current password', 'current-password')}
        {field('password', 'newPassword', 'New password', 'new-password', <PasswordChecklist password={form.password} />)}
        {field('confirm', 'confirmPassword', 'Confirm new password', 'new-password')}
        <div className="col-12">
          <button type="submit" className="btn btn-primary btn-sm px-3" disabled={saving}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
