import { useRef, useState } from 'react';
import { FaSave } from 'react-icons/fa';
import API, { errorMessage } from '../services/api';
import {
  apiFieldErrors,
  clean,
  email,
  lengthBetween,
  NAME_PATTERN,
  onlyErrors,
  personName,
  phone,
} from '../services/validation';

const FIELDS = [
  { name: 'contactNumber', label: 'Mobile Number', type: 'tel', max: 30, autoComplete: 'tel' },
  { name: 'personalEmail', label: 'Personal Email (optional)', type: 'email', max: 254, autoComplete: 'email' },
  { name: 'address', label: 'Residential Address', type: 'text', wide: true, max: 300, autoComplete: 'street-address' },
  { name: 'emergencyContact', label: 'Emergency Contact Person', type: 'text', max: 100 },
  { name: 'guardianRelationship', label: 'Relationship (optional)', type: 'text', max: 60 },
  { name: 'emergencyContactNumber', label: 'Emergency Contact Number', type: 'tel', max: 30 },
];

// "Not provided" is the placeholder stored for new registrations.
const initialValue = (value) => (value && value !== 'Not provided' ? value : '');

const relationship = (value) => {
  const v = clean(value);
  if (!v) return '';
  if (v.length < 2 || v.length > 60) return 'Relationship must be 2–60 characters.';
  return NAME_PATTERN.test(v) ? '' : 'Relationship may only contain letters, spaces, hyphens, apostrophes and periods.';
};

// Same rules as the API (backend/validators/index.js portalProfileRules).
const validateContact = (form) =>
  onlyErrors({
    contactNumber: phone(form.contactNumber, 'Mobile number'),
    personalEmail: form.personalEmail.trim() ? email(form.personalEmail, 'Personal email') : '',
    address: lengthBetween(form.address, 'Address', 5, 300),
    emergencyContact: personName(form.emergencyContact, 'Emergency contact', 100),
    guardianRelationship: relationship(form.guardianRelationship),
    emergencyContactNumber: phone(form.emergencyContactNumber, 'Emergency contact number'),
  });

// Lets a student update their own contact details (PUT /api/portal/profile).
const EditContactForm = ({ student, onSaved, onCancel }) => {
  const [form, setForm] = useState(() =>
    Object.fromEntries(FIELDS.map((f) => [f.name, initialValue(student[f.name])]))
  );
  // Fields the student has left (blur) or tried to submit.
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const submitting = useRef(false);
  const errors = { ...validateContact(form), ...onlyErrors(serverFieldErrors) };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    setTouched(Object.fromEntries(FIELDS.map((f) => [f.name, true])));
    if (Object.keys(errors).length) return;
    submitting.current = true;
    setSaving(true);
    setServerError('');
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, clean(v)]));
      const { data } = await API.put('/portal/profile', body);
      onSaved(data);
    } catch (err) {
      const fieldErrors = apiFieldErrors(err);
      setServerFieldErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setServerError(errorMessage(err));
    } finally {
      submitting.current = false;
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
          const invalid = touched[field.name] && errors[field.name];
          return (
            <div key={field.name} className={field.wide ? 'col-12' : 'col-md-6'}>
              <label className="form-label small text-muted" htmlFor={`contact-${field.name}`}>
                {field.label}
              </label>
              <input
                id={`contact-${field.name}`}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                className={`form-control ${invalid ? 'is-invalid' : ''}`}
                value={form[field.name]}
                maxLength={field.max}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, [field.name]: e.target.value }));
                  if (serverFieldErrors[field.name]) setServerFieldErrors((prev) => ({ ...prev, [field.name]: '' }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.name]: true }))}
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
