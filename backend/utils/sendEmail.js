import nodemailer from 'nodemailer';

// Shared look of every EduTrack email (Gmail strips <style> in some views, but
// the text version always carries the code).
const layout = ({ title, heading, message, codeLabel, code, expiry, footnote }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { color: #94a3b8; margin: 4px 0 0; font-size: 13px; }
        .content { padding: 32px 28px; text-align: center; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .message { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .otp-box { background: #f8fafc; border: 2px dashed #2563eb; border-radius: 10px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
        .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
        .otp-code { font-size: 32px; font-weight: 800; color: #1d4ed8; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; }
        .expiry { font-size: 12px; color: #dc2626; font-weight: 500; margin-bottom: 24px; }
        .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EduTrack Student Information System</h1>
          <p>Academic Portal Security & Account Verification</p>
        </div>
        <div class="content">
          <div class="greeting">${heading}</div>
          <div class="message">${message}</div>
          <div class="otp-box">
            <div class="otp-label">${codeLabel}</div>
            <div class="otp-code">${code}</div>
          </div>
          <div class="expiry">${expiry}</div>
          <div style="font-size: 12px; color: #64748b;">${footnote}</div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} EduTrack SIS. All rights reserved.<br>
          Office of the University Registrar & Admissions
        </div>
      </div>
    </body>
    </html>
  `;

let transporter;
const gmail = (user, pass) =>
  (transporter ??= nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: { user, pass }, // Gmail 16-character App Password
  }));

// Optional comma-separated list (local testing only): real email goes only to
// these addresses; everyone else gets the console fallback instead.
const allowed = (to) => {
  const list = (process.env.EMAIL_ALLOWLIST || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return !list.length || list.includes(to.toLowerCase());
};

// The seeded demo accounts use these domains, whose inboxes nobody on the team
// owns: never email them (real users register with their own addresses).
export const DEMO_EMAIL_DOMAINS = ['edutrack.edu', 'university.edu'];
export const isDemoAddress = (to) => DEMO_EMAIL_DOMAINS.includes(String(to).split('@').pop().toLowerCase());
// Codes may be printed only on a local machine, never in Vercel's logs.
const local = () => !process.env.VERCEL && process.env.NODE_ENV !== 'production';

// Delivery is an object method so tests can replace it (mock.method(mailer, 'deliver')).
export const mailer = {
  async deliver({ to, subject, text, html, devLog }) {
    if (isDemoAddress(to)) {
      console.warn(`[EMAIL SKIPPED] ${to} is a demo address; "${subject}" was not sent.`);
      if (local()) console.log(`[SMTP DEV LOG] Recipient: ${to} | ${devLog}`);
      return { success: true, simulated: true, skipped: true };
    }
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (!emailUser || !emailPass || !allowed(to)) {
      console.warn(
        !emailUser || !emailPass
          ? '⚠️ EMAIL_USER or EMAIL_PASS not set in .env. Falling back to console verification code.'
          : `⚠️ ${to} is not in EMAIL_ALLOWLIST. Falling back to console verification code.`
      );
      console.log(`[SMTP DEV LOG] Recipient: ${to} | ${devLog}`);
      return { success: true, simulated: true };
    }
    const info = await gmail(emailUser, emailPass).sendMail({
      from: `"EduTrack SIS Portal" <${emailUser}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[SMTP] "${subject}" sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  },
};

/**
 * Send an email verification OTP to a recipient's Gmail address
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - numeric OTP code
 */
export const sendVerificationEmail = (toEmail, otpCode) =>
  mailer.deliver({
    to: toEmail,
    subject: `EduTrack Verification Code: ${otpCode}`,
    text: `Your EduTrack Student Registration verification code is: ${otpCode}. Valid for 5 minutes.`,
    html: layout({
      title: 'EduTrack Email Verification',
      heading: 'Student Account Verification',
      message:
        'Thank you for registering on the EduTrack portal. To complete your student registration and verify your email address, please enter the one-time verification code below:',
      codeLabel: 'One-Time Password (OTP)',
      code: otpCode,
      expiry: 'This verification code is valid for 5 minutes only. Do not share this code with anyone.',
      footnote: 'If you did not initiate this registration request, please disregard this email.',
    }),
    devLog: `Verification OTP: ${otpCode}`,
  });

/**
 * Send a "forgot password" code
 * @param {string} toEmail - The account's email address
 * @param {string} code - 6-digit numeric code
 * @param {number} minutes - How long the code is valid
 */
export const sendPasswordResetEmail = (toEmail, code, minutes) =>
  mailer.deliver({
    to: toEmail,
    subject: 'EduTrack password reset code',
    text: [
      `Your EduTrack password reset code is: ${code}`,
      `It is valid for ${minutes} minutes. Do not share this code with anyone.`,
      "If you didn't request this, you can ignore this email.",
    ].join('\n\n'),
    html: layout({
      title: 'EduTrack password reset code',
      heading: 'Password Reset',
      message: 'We received a request to reset the password of your EduTrack account. Enter this code to choose a new password:',
      codeLabel: 'Password Reset Code',
      code,
      expiry: `This code is valid for ${minutes} minutes. Do not share this code with anyone.`,
      footnote: "If you didn't request this, you can ignore this email.",
    }),
    devLog: `Password reset code: ${code}`,
  });
