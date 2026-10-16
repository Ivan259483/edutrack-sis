// Form rules for the student portal. They mirror the API (backend/validators/index.js),
// which enforces them again, so the messages read the same from either side.
export const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*\.?$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,24}$/;
export const REGISTRATION_CODE_LENGTH = 5;
export const RESET_CODE_LENGTH = 6;
export const RESEND_SECONDS = 60;

export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';
export const PASSWORD_CHECKS = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'A number', test: (v) => /\d/.test(v) },
  { label: 'A symbol (e.g. ! @ # $)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

// Each rule returns an error message, or '' when the value is fine.
export const required = (value, label) => (clean(value) ? '' : `${label} is required.`);

export const personName = (value, label, max = 50) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  if (v.length < 2 || v.length > max) return `${label} must be 2–${max} characters.`;
  if (!NAME_PATTERN.test(v)) return `${label} may only contain letters, spaces, hyphens, apostrophes and periods.`;
  return '';
};

export const email = (value, label = 'Email') => {
  const v = String(value ?? '').trim();
  if (!v) return `${label} is required.`;
  if (v.length > 254) return `${label} must be at most 254 characters.`;
  return EMAIL_PATTERN.test(v) ? '' : `Enter a valid ${label === 'Email' ? 'email address' : label.toLowerCase() + ' address'}.`;
};

export const strongPassword = (value) => {
  if (!value) return 'Password is required.';
  if (value.length > 128) return 'Password must be at most 128 characters.';
  return PASSWORD_CHECKS.every((c) => c.test(value)) ? '' : PASSWORD_MESSAGE;
};

export const confirmPassword = (value, password) => {
  if (!value) return 'Confirm your password.';
  return value === password ? '' : 'Passwords do not match.';
};

export const phone = (value, label) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  const digits = v.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(v) && digits >= 7 && digits <= 15
    ? ''
    : `Enter a valid phone number for ${label.toLowerCase()}, e.g. 0917 123 4567.`;
};

export const lengthBetween = (value, label, min, max) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  return v.length < min || v.length > max ? `${label} must be ${min}–${max} characters.` : '';
};

export const digitsCode = (value, length) =>
  new RegExp(`^\\d{${length}}$`).test(String(value ?? '').trim()) ? '' : `Enter the ${length}-digit code from your email.`;

// Only the messages for fields that have errors.
export const onlyErrors = (errors) => Object.fromEntries(Object.entries(errors).filter(([, message]) => message));

// Field messages from an API error ({ errors: [{ field, message }] }), keyed by field.
export const apiFieldErrors = (error) =>
  Object.fromEntries((error?.response?.data?.errors || []).map((e) => [e.field, e.message]));
