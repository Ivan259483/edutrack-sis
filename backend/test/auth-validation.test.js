// Validation, sign-in limits and Forgot Password. Needs a running MongoDB; uses
// its own `edutrack_test_auth` database (test files run in parallel), and the
// email sender is mocked, so no email is ever sent.
// Run with: npm test
import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ quiet: true });
const testUri = new URL(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/edutrack');
testUri.pathname = '/edutrack_test_auth';
process.env.MONGO_URI = testUri.toString();
process.env.JWT_SECRET ||= 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.EMAIL_USER = ''; // never send real email from tests
process.env.EMAIL_PASS = '';
process.env.AUTH_RATE_LIMIT = '1000';

const { default: app } = await import('../app.js');
const { seedDatabase } = await import('../config/seed.js');
const { mailer } = await import('../utils/sendEmail.js');
const { default: AuthThrottle } = await import('../models/AuthThrottle.js');
const { default: PasswordReset } = await import('../models/PasswordReset.js');
const { waitText } = await import('../utils/throttle.js');

let server;
let base;
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
const login = (identifier, password, role) => call('POST', '/auth/login', { body: { identifier, password, role } });
const fieldError = (res, field) => res.body.errors?.find((e) => e.field === field)?.message;

// Every email "sent" during a test, captured by the mocked sender.
let sent;
beforeEach(() => {
  sent = [];
  mock.method(mailer, 'deliver', async (message) => {
    sent.push(message);
    return { success: true };
  });
});
afterEach(() => mock.restoreAll());
const lastCode = () => sent.at(-1)?.text.match(/code is: (\d+)/)?.[1];
// Lets a test skip the one-minute resend cooldown.
const skipCooldowns = () => AuthThrottle.deleteMany({ _id: /^(reset|otp)-request:/ });

before(async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await seedDatabase({ log: () => {} });
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('field validation', () => {
  const form = {
    email: 'Maria.Penaflor@Example.com',
    firstName: 'Ma. Clara',
    lastName: 'Peñaflor-Dela Cruz',
    password: 'Passw0rd!',
    confirmPassword: 'Passw0rd!',
    program: 'BSIT',
    yearLevel: '1st Year',
  };

  it('returns one message per invalid field in a consistent format', async () => {
    const res = await call('POST', '/auth/register', {
      body: { ...form, firstName: 'J', lastName: 'Cruz3', password: 'password', confirmPassword: 'nope' },
    });
    assert.equal(res.status, 400);
    assert.equal(typeof res.body.message, 'string');
    assert.equal(fieldError(res, 'firstName'), 'First name must be 2–50 characters.');
    assert.equal(fieldError(res, 'lastName'), 'Last name may only contain letters, spaces, hyphens, apostrophes and periods.');
    assert.match(fieldError(res, 'password'), /uppercase letter, a lowercase letter, a number and a symbol/);
    assert.equal(fieldError(res, 'confirmPassword'), 'Passwords do not match.');
  });

  it('accepts ñ, accents, periods and hyphens in names, and lowercases emails', async () => {
    await call('POST', '/auth/send-otp', { body: { email: form.email } });
    const otp = sent.at(-1).devLog?.match(/OTP: (\d+)/)?.[1] ?? sent.at(-1).text.match(/is: (\d+)/)[1];
    assert.equal(otp.length, 5);
    assert.equal((await call('POST', '/auth/verify-otp', { body: { email: form.email, otp } })).status, 200);
    const res = await call('POST', '/auth/register', { body: form });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'maria.penaflor@example.com');
    assert.equal(res.body.user.name, 'Ma. Clara Peñaflor-Dela Cruz');
    // Emails are compared case-insensitively.
    const again = await call('POST', '/auth/send-otp', { body: { email: 'MARIA.PENAFLOR@example.com' } });
    assert.equal(fieldError(again, 'email'), 'Email is already registered. Please sign in instead.');
  });

  it('rejects a malformed verification code', async () => {
    const res = await call('POST', '/auth/verify-otp', { body: { email: 'x@example.com', otp: '12ab' } });
    assert.equal(fieldError(res, 'otp'), 'Enter the 5-digit code from your email.');
  });

  it('validates admin student records and reports duplicates on the field', async () => {
    const admin = (await login('admin@edutrack.edu', 'Admin123!', 'admin')).body.token;
    const record = {
      id: 'v-student',
      studentId: '2026-12345',
      fullName: 'Ana Peñaflor',
      email: 'Ana.Penaflor@university.edu',
      contactNumber: '0917 123 4567',
      address: 'Quezon City',
      emergencyContact: "Jose O'Neil",
      emergencyContactNumber: '+63 918 765 4321',
      program: 'BSIT',
      yearLevel: '2nd Year',
      section: 'BSIT 2A',
      academicStatus: 'Active',
      dateEnrolled: '2026-06-01',
    };
    const invalid = await call('POST', '/students', {
      token: admin,
      body: { ...record, studentId: '26-1', contactNumber: 'call me', dateEnrolled: '2999-01-01', fullName: 'A' },
    });
    assert.equal(invalid.status, 400);
    assert.match(fieldError(invalid, 'studentId'), /YYYY-NNNNN/);
    assert.match(fieldError(invalid, 'contactNumber'), /valid phone number/);
    assert.equal(fieldError(invalid, 'dateEnrolled'), 'Date enrolled cannot be in the future.');
    assert.equal(fieldError(invalid, 'fullName'), 'Full name must be 2–100 characters.');

    const created = await call('POST', '/students', { token: admin, body: record });
    assert.equal(created.status, 201);
    assert.equal(created.body.email, 'ana.penaflor@university.edu');
    const duplicate = await call('POST', '/students', {
      token: admin,
      body: { ...record, id: 'v-dup', studentId: '2026-12346', email: 'ANA.PENAFLOR@university.edu' },
    });
    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body.errors, [{ field: 'email', message: 'Email is already registered.' }]);
  });

  it('validates grades, schedules and support tickets', async () => {
    const admin = (await login('admin@edutrack.edu', 'Admin123!', 'admin')).body.token;
    const { body: grades } = await call('GET', '/grades?limit=1', { token: admin });
    const grade = await call('PUT', `/grades/${grades.items[0].id}`, {
      token: admin,
      body: { ...grades.items[0], finalGrade: 5.5, midtermGrade: 1.234 },
    });
    assert.match(fieldError(grade, 'finalGrade'), /1\.00 to 5\.00/);
    assert.match(fieldError(grade, 'midtermGrade'), /two decimals/);

    const { body: schedules } = await call('GET', '/schedules?limit=1', { token: admin });
    const late = await call('PUT', `/schedules/${schedules.items[0].id}`, {
      token: admin,
      body: { ...schedules.items[0], startTime: '17:00', endTime: '16:00' },
    });
    assert.equal(fieldError(late, 'endTime'), 'End time must be after start time.');

    const student = (await login('2024-00115', 'Student123!', 'student')).body.token;
    const ticket = await call('POST', '/portal/tickets', {
      token: student,
      body: { category: 'Grades', subject: 'Hi', message: 'short' },
    });
    assert.equal(fieldError(ticket, 'subject'), 'Subject must be 5–200 characters.');
    assert.equal(fieldError(ticket, 'message'), 'Message must be 10–5000 characters.');
  });
});

describe('sign-in', () => {
  it('requires both fields and matches emails case-insensitively', async () => {
    const empty = await login('  ', '');
    assert.equal(empty.status, 400);
    assert.equal(fieldError(empty, 'identifier'), 'Enter your email or Student ID.');
    assert.equal(fieldError(empty, 'password'), 'Enter your password.');
    assert.equal((await login('ADMIN@EduTrack.edu', 'Admin123!', 'admin')).status, 200);
  });

  it('locks an account for 5 minutes after 5 wrong passwords, without revealing whether it exists', async () => {
    for (const identifier of ['maria.reyes@university.edu', 'nobody@example.com']) {
      for (let i = 1; i <= 4; i++) {
        const res = await login(identifier, 'wrong-password');
        assert.equal(res.status, 401);
        assert.equal(res.body.message, 'Invalid email/Student ID or password.');
      }
      const fifth = await login(identifier, 'wrong-password');
      assert.equal(fifth.status, 429);
      assert.equal(
        fifth.body.message,
        'Too many failed sign-in attempts. Please wait 5 minutes before trying again, or reset your password.'
      );
      assert.equal(fifth.body.retryAfter, 300);
    }
    // Even the right password is refused while locked.
    assert.equal((await login('maria.reyes@university.edu', 'Student123!')).status, 429);
  });
});

describe('forgot password', () => {
  const email = 'john.cruz@university.edu';
  const reset = (body) => call('POST', '/auth/reset-password', { body });
  const forgot = (identifier, role) => call('POST', '/auth/forgot-password', { body: { identifier, role } });
  const newPassword = 'Fresh#Pass9';

  it('answers the same way for existing and unknown accounts, emailing only real ones', async () => {
    const known = await forgot(email, 'student');
    const unknown = await forgot('ghost@example.com', 'student');
    const wrongTab = await forgot('admin@edutrack.edu', 'student');
    for (const res of [known, unknown, wrongTab]) {
      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'If an account matches, we sent a code to its email.');
    }
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, email);
    assert.equal(sent[0].subject, 'EduTrack password reset code');
    assert.match(sent[0].text, /code is: \d{6}/);
    assert.match(sent[0].text, /valid for 15 minutes/);
    assert.match(sent[0].text, /If you didn't request this, you can ignore this email\./);
    const stored = await PasswordReset.findOne({}).lean();
    assert.notEqual(stored.codeHash, lastCode(), 'only a hash of the code is stored');
  });

  it('refuses a second code within 60 seconds, for any identifier', async () => {
    for (const identifier of [email, 'ghost@example.com']) {
      const res = await forgot(identifier, 'student');
      assert.equal(res.status, 429);
      assert.match(res.body.message, /^Please wait \d+ seconds before requesting another code\.$/);
      assert.ok(res.body.retryAfter > 0 && res.body.retryAfter <= 60);
    }
    assert.equal(sent.length, 0);
  });

  it('keeps one active code per account: a new code replaces the old one', async () => {
    await skipCooldowns();
    await PasswordReset.updateMany({}, { sentAt: new Date(Date.now() - 61_000) });
    await forgot(email, 'student');
    const first = lastCode();
    await skipCooldowns();
    await PasswordReset.updateMany({}, { sentAt: new Date(Date.now() - 61_000) });
    await forgot('2024-00105', 'student'); // the same account, by student ID
    const second = lastCode();
    assert.equal(await PasswordReset.countDocuments(), 1);
    const old = await reset({ identifier: email, code: first, password: newPassword, confirmPassword: newPassword });
    if (first !== second) assert.equal(old.status, 400);
  });

  it('rejects weak passwords, mismatched confirmations and wrong codes with field messages', async () => {
    const weak = await reset({ identifier: email, code: '123456', password: 'weakpass', confirmPassword: 'weakpass' });
    assert.match(fieldError(weak, 'password'), /uppercase letter/);
    const mismatch = await reset({ identifier: email, code: '123456', password: newPassword, confirmPassword: 'Other#Pass9' });
    assert.equal(fieldError(mismatch, 'confirmPassword'), 'Passwords do not match.');
    const badFormat = await reset({ identifier: email, code: '12345', password: newPassword, confirmPassword: newPassword });
    assert.equal(fieldError(badFormat, 'code'), 'Enter the 6-digit code from your email.');
    const wrong = await reset({ identifier: email, code: '000000', password: newPassword, confirmPassword: newPassword });
    assert.equal(wrong.status, 400);
    assert.match(fieldError(wrong, 'code'), /incorrect or has expired/);
    // Unknown accounts get exactly the same answer.
    const ghost = await reset({ identifier: 'ghost@example.com', code: '000000', password: newPassword, confirmPassword: newPassword });
    assert.deepEqual(ghost.body, wrong.body);
  });

  it('resets the password, signs out old sessions and lets the new password in', async () => {
    const oldToken = (await login(email, 'Student123!', 'student')).body.token;
    assert.equal((await call('GET', '/auth/me', { token: oldToken })).status, 200);
    await skipCooldowns();
    await PasswordReset.updateMany({}, { sentAt: new Date(Date.now() - 61_000) });
    await forgot(email, 'student');
    const code = lastCode();

    const done = await reset({ identifier: email, role: 'student', code, password: newPassword, confirmPassword: newPassword });
    assert.equal(done.status, 200);
    assert.equal((await call('GET', '/auth/me', { token: oldToken })).status, 401);
    assert.equal((await login(email, 'Student123!', 'student')).status, 401);
    assert.equal((await login(email, newPassword, 'student')).status, 200);
    // The code works only once.
    const reuse = await reset({ identifier: email, code, password: 'Again#Pass9', confirmPassword: 'Again#Pass9' });
    assert.equal(reuse.status, 400);
  });

  it('rejects an expired code', async () => {
    await skipCooldowns();
    await forgot('admin@edutrack.edu', 'admin');
    const code = lastCode();
    await PasswordReset.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const res = await reset({ identifier: 'admin@edutrack.edu', code, password: newPassword, confirmPassword: newPassword });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /incorrect or has expired/);
    assert.equal((await login('admin@edutrack.edu', 'Admin123!', 'admin')).status, 200);
  });

  it('allows 5 wrong tries, then requires a new code', async () => {
    await skipCooldowns();
    await PasswordReset.deleteMany({});
    await forgot('maria.reyes@university.edu', 'student');
    const code = lastCode();
    const attempt = (c) =>
      reset({ identifier: 'maria.reyes@university.edu', code: c, password: newPassword, confirmPassword: newPassword });
    const wrongCode = code === '999999' ? '999998' : '999999';
    for (let i = 1; i <= 4; i++) assert.equal((await attempt(wrongCode)).status, 400);
    assert.equal((await attempt(wrongCode)).status, 429);
    const locked = await attempt(code);
    assert.equal(locked.status, 429);
    assert.equal(locked.body.message, 'Too many incorrect attempts. Please request a new code.');

    // A new code (after the cooldown) works, and also clears the sign-in lock from earlier.
    await skipCooldowns();
    await forgot('maria.reyes@university.edu', 'student');
    assert.equal((await attempt(lastCode())).status, 200);
    assert.equal((await login('maria.reyes@university.edu', newPassword)).status, 200);
  });
});

describe('per-email code limits', () => {
  it('says how long to wait, in seconds or minutes', () => {
    assert.equal(waitText(1000), '1 second');
    assert.equal(waitText(42_000), '42 seconds');
    assert.equal(waitText(61_000), '2 minutes');
    assert.equal(waitText(3 * 60_000), '3 minutes');
  });

  it('allows 5 reset codes an hour per email, for existing and unknown accounts alike', async () => {
    for (const identifier of ['hannah.ong@university.edu', 'ghost.hourly@example.com']) {
      for (let i = 1; i <= 5; i++) {
        await skipCooldowns();
        assert.equal((await call('POST', '/auth/forgot-password', { body: { identifier } })).status, 200);
      }
      await skipCooldowns();
      const sixth = await call('POST', '/auth/forgot-password', { body: { identifier } });
      assert.equal(sixth.status, 429);
      assert.match(
        sixth.body.message,
        /^You have requested 5 codes in the last hour\. Please wait (60|59) minutes before requesting another code\.$/
      );
      assert.ok(sixth.body.retryAfter > 3500);
    }
    // Another student on the same network is not affected.
    await skipCooldowns();
    assert.equal(
      (await call('POST', '/auth/forgot-password', { body: { identifier: 'ryan.gomez@university.edu' } })).status,
      200
    );
  });

  it('applies the 60-second cooldown to registration codes too', async () => {
    const email = 'cooldown.check@example.com';
    assert.equal((await call('POST', '/auth/send-otp', { body: { email } })).status, 200);
    const again = await call('POST', '/auth/send-otp', { body: { email } });
    assert.equal(again.status, 429);
    assert.match(again.body.message, /^Please wait \d+ seconds before requesting another code\.$/);
    assert.ok(again.body.retryAfter > 0 && again.body.retryAfter <= 60);
    assert.equal(sent.length, 1);
  });
});

describe('change password', () => {
  it('returns a fresh token and signs out older sessions', async () => {
    const oldToken = (await login('2024-00108', 'Student123!', 'student')).body.token;
    const same = await call('PUT', '/auth/password', {
      token: oldToken,
      body: { currentPassword: 'Student123!', password: 'Student123!', confirmPassword: 'Student123!' },
    });
    assert.match(fieldError(same, 'password'), /different from your current one/);
    const res = await call('PUT', '/auth/password', {
      token: oldToken,
      body: { currentPassword: 'Student123!', password: 'Changed#Pass1', confirmPassword: 'Changed#Pass1' },
    });
    assert.equal(res.status, 200);
    assert.equal((await call('GET', '/auth/me', { token: oldToken })).status, 401);
    assert.equal((await call('GET', '/auth/me', { token: res.body.token })).status, 200);
  });
});
