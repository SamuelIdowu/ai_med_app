import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Rate limiter for AI endpoints
export const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 10, // Limit each user to 10 requests per minute
    message: {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'You are sending too many requests. Please wait a moment before trying again.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use IP address as the key with proper IPv6 support
    keyGenerator: (req) => {
        return ipKeyGenerator(req.ip ?? 'unknown');
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
            userMessage: 'You are sending too many requests. Please wait a moment before trying again.'
        });
    }
});
