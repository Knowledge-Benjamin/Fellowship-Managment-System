import express from 'express';
import { login, verifyOTP, resendOTP } from '../controllers/authController';
import { loginRateLimiter, otpRateLimiter, resendOTPRateLimiter } from '../middleware/rateLimiters';

const router = express.Router();

// Login endpoint with rate limiting (Step 1: Email/Password)
router.post('/login', loginRateLimiter, login);

// OTP verification endpoint (Step 2: For privileged accounts)
router.post('/verify-otp', otpRateLimiter, verifyOTP);

// Resend OTP endpoint
router.post('/resend-otp', resendOTPRateLimiter, resendOTP);

export default router;
