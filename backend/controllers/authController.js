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
import { clearThrottle, cooldown, lockedFor, recordFailure } from '../utils/throttle.js';
import { REGISTRATION_CODE_LENGTH, RESET_CODE_LENGTH } from '../validators/index.js';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// Sign-in: 5 wrong passwords within 15 minutes lock that account (or unknown
// identifier, so the lock reveals nothing) for 15 minutes.
const LOGIN_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 };
const INVALID_LOGIN = 'Invalid email/Student ID or password.';

// Forgot password: one active code per account, valid 15 minutes, 5 wrong
// tries, a new code at most once a minute.
const RESET_CODE_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60 * 1000;
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

const minutesLeft = (ms) => {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};
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
  if (locked) {
    throw new HttpError(
      429,
      `Too many failed sign-in attempts. Try again in ${minutesLeft(locked)}, or reset your password.`
    );
  }
  // Same message for unknown user and wrong password (no account enumeration).
  if (!user || !(await user.matchPassword(password))) {
    const left = await recordFailure(throttleKey, LOGIN_LIMIT);
    if (!left) {
      throw new HttpError(
        429,
        `Too many failed sign-in attempts. Try again in ${minutesLeft(LOGIN_LIMIT.lockMs)}, or reset your password.`
      );
    }
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
  // The cooldown is per identifier typed, for existing and unknown accounts alike.
  const wait = await cooldown(`reset-request:${key}`, RESEND_COOLDOWN_MS);
  if (wait) {
    const seconds = Math.ceil(wait / 1000);
    return res
      .status(429)
      .json({ message: `Please wait ${seconds} seconds before requesting another code.`, retryAfter: seconds });
  }
  // A new code means a fresh set of tries.
  await clearThrottle(`reset-verify:${key}`);

  const user = await findByIdentifier(identifier);
  if (user && (!role || user.role === role)) {
    const existing = await PasswordReset.findOne({ user: user._id });
    // Also one code per minute per account (it can be named by email or student ID).
    if (!existing || Date.now() - existing.sentAt.getTime() >= RESEND_COOLDOWN_MS) {
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
