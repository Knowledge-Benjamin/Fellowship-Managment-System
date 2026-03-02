import express from 'express';
import { login, verifyOTP, resendOTP, getMe } from '../controllers/authController';
import { loginRateLimiter, otpRateLimiter, resendOTPRateLimiter } from '../middleware/rateLimiters';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Login endpoint with rate limiting (Step 1: Email/Password)
router.post('/login', loginRateLimiter, login);

// OTP verification endpoint (Step 2: For privileged accounts)
router.post('/verify-otp', otpRateLimiter, verifyOTP);

// Resend OTP endpoint
router.post('/resend-otp', resendOTPRateLimiter, resendOTP);

// Get current user (for client-side session refresh — returns same shape as login)
router.get('/me', protect, getMe);

export default router;
