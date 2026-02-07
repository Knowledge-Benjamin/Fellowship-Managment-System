import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login endpoint
 * Allows 5 login attempts per 15 minutes per IP address
 */
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        console.log(`[RATE LIMIT] Blocked login attempt from IP: ${req.ip}`);
        res.status(429).json({
            message: 'Too many login attempts. Please try again in 15 minutes.',
            retryAfter: 900, // seconds
        });
    },
});

/**
 * Rate limiter for OTP verification endpoint
 * Allows 10 OTP verification attempts per 15 minutes
 */
export const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many OTP verification attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for OTP resend endpoint
 * Allows 3 OTP resend requests per 15 minutes
 */
export const resendOTPRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: 'Too many OTP resend requests. Please wait before requesting again.',
    standardHeaders: true,
    legacyHeaders: false,
});

export default {
    loginRateLimiter,
    otpRateLimiter,
    resendOTPRateLimiter,
};
