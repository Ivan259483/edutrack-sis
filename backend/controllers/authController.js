import bcrypt from 'bcryptjs';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Otp from '../models/Otp.js';
import PasswordReset from '../models/PasswordReset.js';
import { PROGRAM_NAMES, PROGRAMS } from '../models/plugins.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import generateToken from '../utils/generateToken.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/sendEmail.js';
import { initials, today } from '../utils/rules.js';
import { clearThrottle, cooldown, lockedFor, quota, recordFailure, waitText } from '../utils/throttle.js';
import { REGISTRATION_CODE_LENGTH, RESET_CODE_LENGTH } from '../validators/index.js';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Limits count mainly per account/email (stored in MongoDB), so a whole class
// on one Wi-Fi network is not blocked by one person; routes/authRoutes.js adds
// a looser per-IP limit on top.

// Sign-in: 5 wrong passwords within 15 minutes lock that account (or unknown
// identifier, so the lock reveals nothing) for 5 minutes.
const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000, lockMs: 5 * 60 * 1000 };
const INVALID_LOGIN = 'Invalid email/Student ID or password.';
const loginLocked = (ms) =>
  `Too many failed sign-in attempts. Please wait ${waitText(ms)} before trying again, or reset your password.`;

// Emailed codes (registration and forgot password): at most one a minute and
// 5 an hour per email address.
const RESEND_COOLDOWN_MS = 60 * 1000;
const HOURLY_CODES = { limit: 5, windowMs: 60 * 60 * 1000 };
// `retryAfter` (seconds) lets the pages count down to the next try.
const limited = (message, ms) => Object.assign(new HttpError(429, message), { retryAfter: Math.ceil(ms / 1000) });
const tooSoon = (ms) => limited(`Please wait ${waitText(ms)} before requesting another code.`, ms);
const tooManyCodes = (ms) =>
  limited(
    `You have requested ${HOURLY_CODES.limit} codes in the last hour. Please wait ${waitText(ms)} before requesting another code.`,
    ms
  );
// Checks both limits for one address; throws the right message when either is hit.
const allowCode = async (scope, key) => {
  const wait = await cooldown(`${scope}-request:${key}`, RESEND_COOLDOWN_MS);
  if (wait) throw tooSoon(wait);
  const hourly = await quota(`${scope}-hourly:${key}`, HOURLY_CODES);
  if (hourly) throw tooManyCodes(hourly);
};

// Forgot password: one active code per account, valid 15 minutes, 5 wrong tries.
const RESET_CODE_MINUTES = 15;
const RESET_LIMIT = { limit: 5, windowMs: RESET_CODE_MINUTES * 60 * 1000, lockMs: RESET_CODE_MINUTES * 60 * 1000 };
const RESET_SENT = 'If an account matches, we sent a code to its email.';
const INVALID_RESET_CODE = 'The code is incorrect or has expired. Check your latest email or request a new code.';
const TOO_MANY_RESET_TRIES = 'Too many incorrect attempts. Please request a new code.';

const publicUser = (user, profile = null) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId,
  profile,
});

const programCode = (value) =>
  PROGRAMS.includes(value) ? value : Object.keys(PROGRAM_NAMES).find((k) => PROGRAM_NAMES[k] === value);

// Emails are compared case-insensitively (strength 2 ignores letter case), so
// accounts saved before emails were lowercased still match.
const caseInsensitive = { locale: 'en', strength: 2 };
const findByIdentifier = (identifier) =>
  User.findOne({ $or: [{ email: identifier.toLowerCase() }, { studentId: identifier }] }).collation(caseInsensitive);
const emailTaken = (email) => User.exists({ email }).collation(caseInsensitive);

// Only an HMAC of a reset code is stored, so a database leak can't be brute-forced offline.
const hashResetCode = (userId, code) =>
  createHmac('sha256', process.env.JWT_SECRET).update(`password-reset:${userId}:${code}`).digest('hex');
const sameHash = (a, b) => timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

// @desc    Send a 5-digit verification code to the email address
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (await emailTaken(email)) {
    throw new HttpError(400, 'An account with this email already exists. Please sign in instead.', {
      email: 'Email is already registered. Please sign in instead.',
    });
  }
  await allowCode('otp', email);
  // Cryptographically secure code; only its hash is stored.
  const otp = String(randomInt(10 ** (REGISTRATION_CODE_LENGTH - 1), 10 ** REGISTRATION_CODE_LENGTH));
  await Otp.findOneAndUpdate(
    { email },
    { otp: await bcrypt.hash(otp, 10), attempts: 0, verified: false, createdAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );
  try {
    await sendVerificationEmail(email, otp);
  } catch (emailErr) {
    console.error('SMTP delivery error:', emailErr.message);
    if (process.env.NODE_ENV === 'production') {
      throw new HttpError(502, 'The verification email could not be sent. Please try again later.');
    }
    console.log(`[SMTP DEV LOG] Recipient: ${email} | Verification OTP: ${otp}`);
  }
  res.json({
    status: 'success',
    message: `A ${REGISTRATION_CODE_LENGTH}-digit verification code has been sent to ${email}.`,
  });
});

// @desc    Verify the emailed code
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const record = await Otp.findOne({ email });
  if (!record || Date.now() - record.createdAt.getTime() > OTP_LIFETIME_MS) {
    const message = 'Verification code has expired or was not requested. Please request a new code.';
    throw new HttpError(400, message, { otp: message });
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new HttpError(429, 'Too many incorrect attempts. Please request a new code.', {
      otp: 'Too many incorrect attempts. Please request a new code.',
    });
  }
  if (!(await bcrypt.compare(otp, record.otp))) {
    record.attempts += 1;
    await record.save();
    const message = 'Invalid verification code. Please check your email and try again.';
    throw new HttpError(400, message, { otp: message });
  }
  record.verified = true;
  await record.save();
  res.json({ status: 'success', message: 'Email address successfully verified.' });
});

// @desc    Register a student account (requires a verified email)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, yearLevel } = req.body;
  const program = programCode(req.body.program);

  const verification = await Otp.findOne({ email, verified: true });
  if (!verification) {
    throw new HttpError(400, 'Please verify your email address before registering.');
  }
  if (await emailTaken(email)) {
    throw new HttpError(400, 'An account with this email already exists.', { email: 'Email is already registered.' });
  }

  // A student record the registrar already created can be claimed by its owner
  // (email ownership was just proven by the verification code).
  let student = await Student.findOne({ email });
  if (student?.user) throw new HttpError(400, 'This student record already has an account.');

  const fullName = `${firstName} ${lastName}`;
  if (!student) {
    let studentId;
    do studentId = `${new Date().getFullYear()}-${randomInt(10000, 100000)}`;
    while (await Student.exists({ studentId }));
    student = new Student({
      studentId,
      fullName,
      email,
      contactNumber: 'Not provided',
      address: 'Not provided',
      emergencyContact: 'Not provided',
      emergencyContactNumber: 'Not provided',
      program,
      yearLevel,
      section: `${program} ${yearLevel[0]}A`,
      academicStatus: 'Active',
      dateEnrolled: today(),
      avatarInitials: initials(fullName),
    });
  }

  // Role is never taken from the request: self-registration is student-only.
  const user = await User.create({
    name: student.fullName,
    email,
    password,
    role: 'student',
    studentId: student.studentId,
  });
  student.user = user._id;
  try {
    await student.save();
  } catch (err) {
    await User.deleteOne({ _id: user._id });
    throw err;
  }
  await Otp.deleteOne({ _id: verification._id });

  res.status(201).json({
    status: 'success',
    token: generateToken(user),
    user: publicUser(user, student),
  });
});

// @desc    Sign in with email or student ID and get a JWT
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { identifier, password, role } = req.body;
  const user = await findByIdentifier(identifier).select('+password');

  const throttleKey = `login:${user ? user.id : identifier.toLowerCase()}`;
  const locked = await lockedFor(throttleKey);
  if (locked) throw limited(loginLocked(locked), locked);
  // Same message for unknown user and wrong password (no account enumeration).
  if (!user || !(await user.matchPassword(password))) {
    const left = await recordFailure(throttleKey, LOGIN_LIMIT);
    if (!left) throw limited(loginLocked(LOGIN_LIMIT.lockMs), LOGIN_LIMIT.lockMs);
    throw new HttpError(401, INVALID_LOGIN);
  }
  await clearThrottle(throttleKey);
  if (role && user.role !== role) {
    throw new HttpError(
      403,
      `This account is registered as ${user.role === 'admin' ? 'an administrator' : 'a student'}. Please switch to the ${user.role} tab.`
    );
  }
  const profile = user.role === 'student' ? await Student.findOne({ user: user._id }) : null;
  res.json({
    status: 'success',
    token: generateToken(user),
    user: publicUser(user, profile),
  });
});

// @desc    Current signed-in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  const profile = req.user.role === 'student' ? await Student.findOne({ user: req.user._id }) : null;
  res.json({ user: publicUser(req.user, profile) });
});

// @desc    Change own password (signs out other sessions; returns a fresh token)
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) {
    throw new HttpError(400, 'Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
  }
  if (await user.matchPassword(req.body.password)) {
    const message = 'Choose a new password that is different from your current one.';
    throw new HttpError(400, message, { password: message });
  }
  user.password = req.body.password;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  res.json({ status: 'success', message: 'Password updated.', token: generateToken(user) });
});

// @desc    Email a 6-digit password reset code (same answer whether or not the account exists)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier, role } = req.body;
  const key = identifier.toLowerCase();
  // Limits apply to the identifier typed, for existing and unknown accounts
  // alike, so hitting one reveals nothing.
  await allowCode('reset', key);
  // A new code means a fresh set of tries.
  await clearThrottle(`reset-verify:${key}`);

  const user = await findByIdentifier(identifier);
  if (user && (!role || user.role === role)) {
    const existing = await PasswordReset.findOne({ user: user._id });
    // The same limits per account too (it can be named by email or by student
    // ID); these are silent, so the answer stays the same.
    const accountAllowed =
      (!existing || Date.now() - existing.sentAt.getTime() >= RESEND_COOLDOWN_MS) &&
      !(await quota(`reset-hourly:account:${user.id}`, HOURLY_CODES));
    if (accountAllowed) {
      const code = String(randomInt(0, 10 ** RESET_CODE_LENGTH)).padStart(RESET_CODE_LENGTH, '0');
      await PasswordReset.findOneAndUpdate(
        { user: user._id },
        {
          codeHash: hashResetCode(user.id, code),
          attempts: 0,
          sentAt: new Date(),
          expiresAt: new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000),
        },
        { upsert: true }
      );
      try {
        await sendPasswordResetEmail(user.email, code, RESET_CODE_MINUTES);
      } catch (emailErr) {
        // Still the same answer, so the response never reveals that the account exists.
        console.error('SMTP delivery error:', emailErr.message);
        if (process.env.NODE_ENV === 'production') await PasswordReset.deleteOne({ user: user._id });
        else console.log(`[SMTP DEV LOG] Recipient: ${user.email} | Password reset code: ${code}`);
      }
    }
  }
  res.json({ status: 'success', message: RESET_SENT, retryAfter: RESEND_COOLDOWN_MS / 1000 });
});

// @desc    Set a new password with the emailed code
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
  const { identifier, role, code, password } = req.body;
  const verifyKey = `reset-verify:${identifier.toLowerCase()}`;
  if (await lockedFor(verifyKey)) {
    throw new HttpError(429, TOO_MANY_RESET_TRIES, { code: TOO_MANY_RESET_TRIES });
  }
  const user = await findByIdentifier(identifier).select('+password');
  const record =
    user && (!role || user.role === role)
      ? await PasswordReset.findOne({ user: user._id, expiresAt: { $gt: new Date() } })
      : null;

  if (!record || !sameHash(record.codeHash, hashResetCode(user.id, code))) {
    let accountLocked = false;
    if (record) {
      record.attempts += 1;
      accountLocked = record.attempts >= RESET_LIMIT.limit;
      // After the last allowed try the code is gone; a new one must be requested.
      await (accountLocked ? record.deleteOne() : record.save());
    }
    const left = await recordFailure(verifyKey, RESET_LIMIT);
    if (!left || accountLocked) throw new HttpError(429, TOO_MANY_RESET_TRIES, { code: TOO_MANY_RESET_TRIES });
    throw new HttpError(400, INVALID_RESET_CODE, { code: INVALID_RESET_CODE });
  }

  user.password = password;
  // Signs out every session that was opened with the old password.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  await record.deleteOne();
  await clearThrottle(verifyKey, `login:${user.id}`);
  res.json({ status: 'success', message: 'Your password has been reset. Sign in with your new password.' });
});
