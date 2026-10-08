import { useState } from 'react';
import { FaSave } from 'react-icons/fa';
import API, { errorMessage } from '../services/api';

// Same rules as the API (backend/validators/index.js portalProfileRules).
const PHONE = /^\+?[0-9][0-9 ()-]{6,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FIELDS = [
  { name: 'contactNumber', label: 'Mobile Number', type: 'tel', required: true },
  { name: 'personalEmail', label: 'Personal Email (optional)', type: 'email' },
  { name: 'address', label: 'Residential Address', type: 'text', required: true, wide: true },
  { name: 'emergencyContact', label: 'Emergency Contact Person', type: 'text', required: true },
  { name: 'guardianRelationship', label: 'Relationship (optional)', type: 'text' },
  { name: 'emergencyContactNumber', label: 'Emergency Contact Number', type: 'tel', required: true },
];

// "Not provided" is the placeholder stored for new registrations.
const initialValue = (value) => (value && value !== 'Not provided' ? value : '');

const validateContact = (form) => {
  const errors = {};
  for (const field of FIELDS) {
    if (field.required && !form[field.name].trim()) errors[field.name] = `${field.label} is required.`;
  }
  for (const name of ['contactNumber', 'emergencyContactNumber']) {
    if (!errors[name] && !PHONE.test(form[name].trim())) errors[name] = 'Enter a valid phone number (digits, spaces, +, - or parentheses).';
  }
  if (form.personalEmail.trim() && !EMAIL.test(form.personalEmail.trim())) errors.personalEmail = 'Enter a valid email address.';
  if (form.address.trim().length > 300) errors.address = 'Address must be at most 300 characters.';
  return errors;
};

// Lets a student update their own contact details (PUT /api/portal/profile).
const EditContactForm = ({ student, onSaved, onCancel }) => {
  const [form, setForm] = useState(() =>
    Object.fromEntries(FIELDS.map((f) => [f.name, initialValue(student[f.name])]))
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const errors = validateContact(form);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true);
    setServerError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
      const { data } = await API.put('/portal/profile', body);
      onSaved(data);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white" onSubmit={handleSubmit} noValidate>
      <h6 className="fw-bold text-dark mb-1">Edit Contact Details</h6>
      <p className="text-muted small mb-3">
        Name, student ID and academic information are managed by the Registrar.
      </p>
      {serverError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {serverError}
        </div>
      )}
      <div className="row g-3">
        {FIELDS.map((field) => {
          const invalid = touched && errors[field.name];
          return (
            <div key={field.name} className={field.wide ? 'col-12' : 'col-md-6'}>
              <label className="form-label small text-muted" htmlFor={`contact-${field.name}`}>
                {field.label}
              </label>
              <input
                id={`contact-${field.name}`}
                name={field.name}
                type={field.type}
                className={`form-control ${invalid ? 'is-invalid' : ''}`}
                value={form[field.name]}
                maxLength={field.name === 'address' ? 300 : 120}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                aria-invalid={Boolean(invalid)}
                aria-describedby={invalid ? `contact-${field.name}-error` : undefined}
              />
              {invalid && (
                <div id={`contact-${field.name}-error`} className="invalid-feedback">
                  {errors[field.name]}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="d-flex gap-2 mt-3">
        <button type="submit" className="btn btn-primary d-flex align-items-center gap-2" disabled={saving}>
          <FaSave /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EditContactForm;
