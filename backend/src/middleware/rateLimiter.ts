import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const rateLimitKey = (req: { ip?: string }) => ipKeyGenerator(req.ip ?? 'unknown');

// Stricter limiter for unauthenticated (guest) AI chat access.
// Applied after optional auth so signed-in users only hit aiRateLimiter.
export const guestAiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        error: 'Too many guest requests',
        code: 'RATE_LIMIT_EXCEEDED',
        userMessage: 'Guest AI is limited to 5 requests per minute. Please wait a moment or sign in.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => rateLimitKey(req),
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many guest requests',
            code: 'RATE_LIMIT_EXCEEDED',
            userMessage: 'Guest AI is limited to 5 requests per minute. Please wait a moment or sign in.',
        });
    },
});

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
