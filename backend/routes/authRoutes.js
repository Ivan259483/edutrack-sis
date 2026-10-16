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

// Slow down password guessing and OTP spamming per IP address. This counter
// lives in memory (per serverless instance); the per-account limits that must
// hold on Vercel are stored in MongoDB (see utils/throttle.js).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/login', authLimiter, loginRules, loginUser);
router.post('/register', authLimiter, registerRules, registerUser);
router.post('/send-otp', authLimiter, sendOtpRules, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtpRules, verifyOtp);
router.post('/forgot-password', authLimiter, forgotPasswordRules, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, resetPassword);
router.get('/me', protect, getMe);
router.put('/password', protect, authLimiter, changePasswordRules, changePassword);

export default router;
