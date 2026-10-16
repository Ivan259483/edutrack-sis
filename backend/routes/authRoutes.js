import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  forgotPassword,
  getMe,
  loginUser,
  registerUser,
  resetPassword,
  sendOtp,
  verifyOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { waitText } from '../utils/throttle.js';
import {
  changePasswordRules,
  forgotPasswordRules,
  loginRules,
  registerRules,
  resetPasswordRules,
  sendOtpRules,
  verifyOtpRules,
} from '../validators/index.js';

const router = express.Router();

// Looser per-IP safety net (the main limits are per account/email, kept in
// MongoDB: see controllers/authController.js). This counter lives in memory, per
// serverless instance. Requests that send an email count every time; sign-in,
// registration and code checks count only failures, so a whole class signing in
// over one Wi-Fi network is never blocked. AUTH_RATE_LIMIT raises the limit.
const perIp = ({ skipSuccessfulRequests = false } = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      const ms = Math.max(1000, req.rateLimit.resetTime - Date.now());
      res.status(429).json({
        message: `Too many attempts from this network. Please wait ${waitText(ms)} before trying again.`,
        retryAfter: Math.ceil(ms / 1000),
      });
    },
  });
const emailLimiter = perIp();
const failureLimiter = perIp({ skipSuccessfulRequests: true });

router.post('/login', failureLimiter, loginRules, loginUser);
router.post('/register', failureLimiter, registerRules, registerUser);
router.post('/send-otp', emailLimiter, sendOtpRules, sendOtp);
router.post('/verify-otp', failureLimiter, verifyOtpRules, verifyOtp);
router.post('/forgot-password', emailLimiter, forgotPasswordRules, forgotPassword);
router.post('/reset-password', failureLimiter, resetPasswordRules, resetPassword);
router.get('/me', protect, getMe);
router.put('/password', protect, failureLimiter, changePasswordRules, changePassword);

export default router;
