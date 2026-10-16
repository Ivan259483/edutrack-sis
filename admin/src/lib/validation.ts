// Form rules for the admin portal. They mirror the API (backend/validators/index.js),
// which enforces them again, so a message reads the same from either side.
export const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*\.?$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,24}$/;
export const STUDENT_ID_PATTERN = /^\d{4}-\d{5}$/;
export const ROOM_PATTERN = /^[\p{L}\d][\p{L}\d .#-]*$/u;
// Records created at registration carry this until the student fills them in.
export const NOT_PROVIDED = 'Not provided';

export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';
export const PASSWORD_CHECKS = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
  { label: 'A symbol (e.g. ! @ # $)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export type FieldErrors = Record<string, string>;

/** Trims and collapses inner spaces, as the API does. */
export const clean = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

// Each rule returns an error message, or '' when the value is fine.
export const required = (value: unknown, label: string) =>
  clean(value) ? '' : `${label} is required.`;

export const lengthBetween = (value: unknown, label: string, min: number, max: number) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  return v.length < min || v.length > max ? `${label} must be ${min}–${max} characters.` : '';
};

export const personName = (value: unknown, label: string, max = 50) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  if (v.length < 2 || v.length > max) return `${label} must be 2–${max} characters.`;
  return NAME_PATTERN.test(v)
    ? ''
    : `${label} may only contain letters, spaces, hyphens, apostrophes and periods.`;
};

export const email = (value: unknown) => {
  const v = String(value ?? '').trim();
  if (!v) return 'Email is required.';
  if (v.length > 254) return 'Email must be at most 254 characters.';
  return EMAIL_PATTERN.test(v) ? '' : 'Enter a valid email address, e.g. name@school.edu.';
};

export const phone = (value: unknown, label: string, { allowPlaceholder = false } = {}) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  if (allowPlaceholder && v === NOT_PROVIDED) return '';
  const digits = v.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(v) && digits >= 7 && digits <= 15
    ? ''
    : `Enter a valid phone number for ${label.toLowerCase()}, e.g. 0917 123 4567.`;
};

export const studentId = (value: unknown) => {
  const v = clean(value);
  if (!v) return 'Student ID is required.';
  return STUDENT_ID_PATTERN.test(v) ? '' : 'Student ID must use the format YYYY-NNNNN, e.g. 2024-00115.';
};

export const pastDate = (value: unknown, label: string, today: string) => {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()))
    return `${label} must be a valid date (YYYY-MM-DD).`;
  if (v < '1990-01-01') return `${label} must be in 1990 or later.`;
  return v > today ? `${label} cannot be in the future.` : '';
};

export const strongPassword = (value: string) => {
  if (!value) return 'Password is required.';
  if (value.length > 128) return 'Password must be at most 128 characters.';
  return PASSWORD_CHECKS.every((c) => c.test(value)) ? '' : PASSWORD_MESSAGE;
};

export const confirmPassword = (value: string, password: string) => {
  if (!value) return 'Confirm your password.';
  return value === password ? '' : 'Passwords do not match.';
};

/** Only the entries that carry a message. */
export const onlyErrors = (errors: FieldErrors): FieldErrors =>
  Object.fromEntries(Object.entries(errors).filter(([, message]) => message));

/** Props that link an input to the FieldError with this id. */
export const errorProps = (id: string, message?: string) =>
  message ? { 'aria-invalid': true as const, 'aria-describedby': id } : {};
