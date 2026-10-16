import { body } from 'express-validator';
import { DAYS, PROGRAMS, SEMESTERS, YEAR_LEVELS } from '../models/plugins.js';
import { validate } from '../middleware/validate.js';
import { today } from '../utils/rules.js';

// Field rules shared by every route. The student portal (frontend/src/services/validation.js)
// and the admin portal (admin/src/lib/validation.ts) use the same patterns and messages,
// so a message shown under a field reads the same whether it came from the page or the API.
export const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ .'’-]+[\p{L}\p{M}]+)*\.?$/u;
export const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,24}$/;
export const STUDENT_ID_PATTERN = /^\d{4}-\d{5}$/;
export const SUBJECT_CODE_PATTERN = /^[A-Z]{2,4}\d{3}$/;
export const ROOM_PATTERN = /^[\p{L}\d][\p{L}\d .#-]*$/u;
export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.';
// Registration codes stay 5 digits: the Flutter app (same live API) expects 5.
export const REGISTRATION_CODE_LENGTH = 5;
export const RESET_CODE_LENGTH = 6;
// Records created at registration carry this until the student fills them in.
const NOT_PROVIDED = 'Not provided';

const LABELS = {
  studentId: 'Student ID',
  fullName: 'Full name',
  firstName: 'First name',
  lastName: 'Last name',
  contactNumber: 'Contact number',
  emergencyContact: 'Emergency contact',
  emergencyContactNumber: 'Emergency contact number',
  dateEnrolled: 'Date enrolled',
  yearLevel: 'Year level',
  academicStatus: 'Status',
  subjectCode: 'Subject code',
  subjectTitle: 'Subject title',
  startTime: 'Start time',
  endTime: 'End time',
  midtermGrade: 'Midterm grade',
  finalGrade: 'Final grade',
  academicYear: 'Academic year',
  targetAudience: 'Target audience',
  targetValue: 'Target',
  personalEmail: 'Personal email',
  guardianRelationship: 'Relationship',
  currentPassword: 'Current password',
  identifier: 'Email or Student ID',
};
// 'subjects.*.units' -> 'Units', 'emergencyContactNumber' -> 'Emergency contact number'
const label = (field) => {
  const key = field.split('.').pop();
  if (LABELS[key]) return LABELS[key];
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
const collapseSpaces = (value) => value.replace(/\s+/g, ' ');

const text = (field, max = 200, min = 1) =>
  body(field)
    .isString()
    .withMessage(`${label(field)} must be text.`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${label(field)} is required.`)
    .bail()
    .isLength({ min, max })
    .withMessage(
      min > 1
        ? `${label(field)} must be ${min}–${max} characters.`
        : `${label(field)} must be at most ${max} characters.`
    );
const optionalText = (field, max = 2000) =>
  body(field)
    .optional()
    .isString()
    .withMessage(`${label(field)} must be text.`)
    .bail()
    .trim()
    .isLength({ max })
    .withMessage(`${label(field)} must be at most ${max} characters.`);
const oneOf = (field, values) =>
  body(field).isIn(values).withMessage(`Choose a valid ${label(field).toLowerCase()}.`);
const bool = (field) => body(field).isBoolean({ strict: true }).withMessage(`${label(field)} must be true or false.`);
const time = (field) =>
  body(field).matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage(`${label(field)} must be a time in HH:MM format.`);

// Letters (including ñ and accents), spaces, hyphens, apostrophes and periods,
// e.g. "Peñaflor", "Ma. Clara", "Dela Cruz", "O'Neil".
export const personName = (field, max = 50) =>
  text(field, max, 2)
    .customSanitizer(collapseSpaces)
    .bail()
    .matches(NAME_PATTERN)
    .withMessage(`${label(field)} may only contain letters, spaces, hyphens, apostrophes and periods.`);

// Compared case-insensitively everywhere: stored lowercase, looked up lowercase.
export const email = (field = 'email') =>
  body(field)
    .isString()
    .withMessage('Email is required.')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .bail()
    .isLength({ max: 254 })
    .withMessage('Email must be at most 254 characters.')
    .bail()
    .isEmail()
    .withMessage('Enter a valid email address.')
    .customSanitizer((v) => v.toLowerCase());

// Used for register, password reset and change password (not for login, so
// older accounts with weaker passwords can still sign in).
export const strongPassword = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('Password is required.')
    .bail()
    .notEmpty()
    .withMessage('Password is required.')
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .matches(/[A-Z]/)
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .matches(/[a-z]/)
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .matches(/\d/)
    .withMessage(PASSWORD_MESSAGE)
    .bail()
    .matches(/[^A-Za-z0-9]/)
    .withMessage(PASSWORD_MESSAGE);

// Optional for older clients (the Flutter app does not send it); checked when present.
const confirmPassword = (required = false) =>
  (required ? body('confirmPassword') : body('confirmPassword').optional())
    .isString()
    .withMessage('Confirm your password.')
    .bail()
    .notEmpty()
    .withMessage('Confirm your password.')
    .bail()
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match.');

const phone = (field, { allowPlaceholder = false } = {}) =>
  text(field, 30)
    .bail()
    .custom(
      (v) =>
        (allowPlaceholder && v === NOT_PROVIDED) ||
        (PHONE_PATTERN.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15)
    )
    .withMessage(`Enter a valid phone number for ${label(field).toLowerCase()}, e.g. 0917 123 4567.`);

const code = (field, length) =>
  body(field)
    .isString()
    .withMessage(`Enter the ${length}-digit code from your email.`)
    .bail()
    .trim()
    .matches(new RegExp(`^\\d{${length}}$`))
    .withMessage(`Enter the ${length}-digit code from your email.`);

// 1.00–5.00 with up to two decimals, or null when not yet encoded.
const nullableGrade = (field) =>
  body(field)
    .custom(
      (v) =>
        v === null ||
        (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-9)
    )
    .withMessage(`${label(field)} must be from 1.00 to 5.00 with up to two decimals.`);
const units = (field) =>
  body(field).isInt({ min: 1, max: 6 }).withMessage('Units must be a whole number from 1 to 6.').toInt();
const isoDate = (field, { notFuture = false } = {}) =>
  text(field, 10)
    .bail()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage(`${label(field)} must be a valid date (YYYY-MM-DD).`)
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${label(field)} must be a valid date (YYYY-MM-DD).`)
    .bail()
    .custom((v) => v >= '1990-01-01')
    .withMessage(`${label(field)} must be in 1990 or later.`)
    .bail()
    .custom((v) => !notFuture || v <= today())
    .withMessage(`${label(field)} cannot be in the future.`);
const academicYear = (field) =>
  body(field)
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Use YYYY-YYYY for the academic year, e.g. 2024-2025.')
    .bail()
    .custom((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1)
    .withMessage('Academic year must span consecutive years, e.g. 2024-2025.');
const subjectCode = (field, { optional = false } = {}) =>
  (optional ? body(field).optional({ values: 'falsy' }) : body(field))
    .isString()
    .withMessage(`${label(field)} is required.`)
    .bail()
    .trim()
    .toUpperCase()
    .matches(SUBJECT_CODE_PATTERN)
    .withMessage(`${label(field)} must look like CS201 (2–4 letters and 3 digits).`);
const section = (field) =>
  text(field, 30)
    .bail()
    .matches(/^(BSIT|BSBA|BSEd) [1-4][A-Z]$/)
    .withMessage('Choose a valid section, e.g. BSIT 2A.');

// Clients may choose their own record id (the admin portal does); otherwise MongoDB generates one.
const clientId = body('id')
  .optional()
  .isString()
  .matches(/^[\w-]{1,64}$/)
  .withMessage('Record id must be 1-64 letters, numbers, dashes or underscores.');

export const studentRules = [
  clientId,
  text('studentId', 30)
    .bail()
    .matches(STUDENT_ID_PATTERN)
    .withMessage('Student ID must use the format YYYY-NNNNN, e.g. 2024-00115.'),
  // A full name joins a first and a last name (each up to 50 characters).
  personName('fullName', 100),
  email(),
  phone('contactNumber', { allowPlaceholder: true }),
  text('address', 300, 5),
  personName('emergencyContact', 100),
  phone('emergencyContactNumber', { allowPlaceholder: true }),
  oneOf('program', PROGRAMS),
  oneOf('yearLevel', YEAR_LEVELS),
  section('section'),
  oneOf('academicStatus', ['Active', 'On Leave', 'Graduated', 'Suspended']),
  isoDate('dateEnrolled', { notFuture: true }),
  optionalText('avatarInitials', 4),
  validate,
];

const subjectItem = (prefix) => [
  text(`${prefix}.id`, 64),
  subjectCode(`${prefix}.code`),
  text(`${prefix}.title`, 150),
  units(`${prefix}.units`),
  subjectCode(`${prefix}.prerequisite`, { optional: true }),
];

export const enrollmentRules = [
  clientId,
  text('studentId', 64),
  text('studentName', 120),
  text('studentNumber', 30),
  oneOf('program', PROGRAMS),
  oneOf('yearLevel', YEAR_LEVELS),
  text('section', 30),
  body('subjects').isArray({ max: 15 }).withMessage('An enrollment can have at most 15 subjects.'),
  ...subjectItem('subjects.*'),
  bool('subjects.*.hasPrerequisiteMet'),
  oneOf('status', ['Pending', 'Approved', 'Rejected']),
  body('remarks')
    .isString()
    .withMessage('Remarks must be text.')
    .bail()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Remarks must be at most 1000 characters.'),
  text('submittedDate', 40),
  bool('hasPrerequisiteConcerns'),
  body('prerequisiteOverride').optional().isBoolean({ strict: true }),
  validate,
];

export const gradeRules = [
  clientId,
  text('studentId', 64),
  text('studentName', 120),
  text('studentNumber', 30),
  subjectCode('subjectCode'),
  text('subjectTitle', 150),
  text('section', 30),
  oneOf('program', PROGRAMS),
  nullableGrade('midtermGrade'),
  nullableGrade('finalGrade'),
  units('units'),
  oneOf('publishStatus', ['Draft', 'Published']),
  oneOf('semester', SEMESTERS),
  academicYear('academicYear'),
  validate,
];

export const scheduleRules = [
  clientId,
  subjectCode('subjectCode'),
  text('subjectTitle', 150),
  section('section'),
  oneOf('program', PROGRAMS),
  personName('instructor', 100),
  oneOf('day', DAYS),
  time('startTime'),
  time('endTime'),
  text('room', 30)
    .bail()
    .matches(ROOM_PATTERN)
    .withMessage('Room may only contain letters, numbers, spaces, periods, # and hyphens.'),
  validate,
];

export const announcementRules = [
  clientId,
  text('title', 200, 5),
  oneOf('category', ['Academic', 'Enrollment', 'Event', 'General', 'Urgent']),
  text('message', 5000, 10),
  oneOf('targetAudience', ['All Students', 'Specific Program', 'Specific Year Level', 'Specific Section']),
  text('targetValue', 60),
  oneOf('status', ['Draft', 'Published']),
  text('author', 120),
  text('dateCreated', 40),
  body('datePublished')
    .custom((v) => v === null || (typeof v === 'string' && v.length <= 40))
    .withMessage('Date published must be empty or a date.'),
  validate,
];

const replyRules = [
  text('replies.*.id', 64),
  text('replies.*.author', 120),
  text('replies.*.message', 5000),
  text('replies.*.timestamp', 40),
  bool('replies.*.isAdmin'),
];

export const ticketRules = [
  clientId,
  text('ticketNumber', 30),
  text('studentName', 120),
  text('studentNumber', 30),
  oneOf('category', ['Enrollment', 'Grades', 'Technical', 'General']),
  text('subject', 200),
  text('message', 5000),
  oneOf('status', ['Open', 'In Progress', 'Resolved']),
  text('dateCreated', 40),
  text('dateUpdated', 40),
  body('replies').isArray({ max: 200 }).withMessage('A ticket can have at most 200 replies.'),
  ...replyRules,
  validate,
];

export const notificationRules = [
  clientId,
  text('title', 200),
  body('description').isString().isLength({ max: 500 }).withMessage('Description must be at most 500 characters.'),
  text('timestamp', 40),
  bool('read'),
  oneOf('type', ['enrollment', 'ticket', 'announcement', 'grade']),
  body('href')
    .optional()
    .matches(/^\/(?:students|enrollment|grades|schedules|announcements|helpdesk|settings)?(?:\?record=[\w%-]+)?$/)
    .withMessage('Link must be an internal admin link.'),
  validate,
];

export const activityLogRules = [
  clientId,
  text('action', 300),
  text('actor', 120),
  text('timestamp', 40),
  oneOf('type', ['enrollment', 'grade', 'announcement', 'ticket', 'student', 'schedule', 'settings']),
  validate,
];

export const subjectRules = [
  clientId,
  subjectCode('code'),
  text('title', 150, 3),
  units('units'),
  subjectCode('prerequisite', { optional: true }),
  optionalText('description', 1000),
  validate,
];

export const settingsRules = [
  academicYear('academicYear'),
  oneOf('semester', SEMESTERS),
  bool('enrollmentOpen'),
  bool('gradeEncodingOpen'),
  bool('notifyNewEnrollments'),
  bool('notifyNewTickets'),
  bool('notifySystemActivity'),
  validate,
];

// ─── Auth ────────────────────────────────────────────────────────────
const identifier = body('identifier')
  .isString()
  .withMessage('Enter your email or Student ID.')
  .bail()
  .trim()
  .notEmpty()
  .withMessage('Enter your email or Student ID.')
  .bail()
  .isLength({ max: 254 })
  .withMessage('Email or Student ID must be at most 254 characters.');
const role = body('role').optional().isIn(['admin', 'student']).withMessage('Choose Student or Administrator.');

export const loginRules = [
  identifier,
  body('password')
    .isString()
    .withMessage('Enter your password.')
    .bail()
    .notEmpty()
    .withMessage('Enter your password.')
    .bail()
    .isLength({ max: 128 })
    .withMessage('Password must be at most 128 characters.'),
  role,
  validate,
];
export const sendOtpRules = [email(), validate];
export const verifyOtpRules = [email(), code('otp', REGISTRATION_CODE_LENGTH), validate];
export const registerRules = [
  email(),
  personName('firstName'),
  personName('lastName'),
  strongPassword(),
  confirmPassword(),
  body('program')
    .isIn([...PROGRAMS, 'BS Information Technology', 'BS Business Administration', 'Bachelor of Secondary Education'])
    .withMessage('Choose an offered program.'),
  oneOf('yearLevel', YEAR_LEVELS),
  validate,
];
export const changePasswordRules = [
  body('currentPassword')
    .isString()
    .withMessage('Enter your current password.')
    .bail()
    .notEmpty()
    .withMessage('Enter your current password.'),
  // The new password is sent as `password` so the same strength rule applies.
  strongPassword(),
  confirmPassword(),
  validate,
];
export const forgotPasswordRules = [identifier, role, validate];
export const resetPasswordRules = [
  identifier,
  role,
  code('code', RESET_CODE_LENGTH),
  strongPassword(),
  confirmPassword(true),
  validate,
];

export const portalEnrollmentRules = [
  body('subjectCodes').isArray({ min: 1, max: 12 }).withMessage('Select 1 to 12 subjects.'),
  body('subjectCodes.*').isString().trim().matches(/^[A-Z]{2,4}\d{3}$/i).withMessage('Invalid subject code.'),
  validate,
];
export const portalTicketRules = [
  oneOf('category', ['Enrollment', 'Grades', 'Technical', 'General']),
  text('subject', 200, 5),
  text('message', 5000, 10),
  validate,
];
export const portalReplyRules = [text('message', 5000), validate];

// Students may edit only their contact details. matchedData() in `validate`
// drops every other field (role, studentId, fullName, program, ...).
export const portalProfileRules = [
  phone('contactNumber'),
  text('address', 300, 5),
  body('personalEmail')
    .optional()
    .isString()
    .withMessage('Personal email must be text.')
    .bail()
    .trim()
    .toLowerCase()
    .if((value) => value !== '')
    .isLength({ max: 254 })
    .withMessage('Personal email must be at most 254 characters.')
    .bail()
    .isEmail()
    .withMessage('Enter a valid personal email address.'),
  personName('emergencyContact', 100),
  phone('emergencyContactNumber'),
  body('guardianRelationship')
    .optional()
    .isString()
    .withMessage('Relationship must be text.')
    .bail()
    .trim()
    .customSanitizer(collapseSpaces)
    .if((value) => value !== '')
    .isLength({ min: 2, max: 60 })
    .withMessage('Relationship must be 2–60 characters.')
    .bail()
    .matches(NAME_PATTERN)
    .withMessage('Relationship may only contain letters, spaces, hyphens, apostrophes and periods.'),
  validate,
];
