const rateLimit = require("express-rate-limit");

/**
 * Shared handler that returns a structured error envelope instead of
 * the default plain-text response, keeping the API consistent.
 */
const rateLimitHandler = (req, res) => {
    res.status(429).json({
        errors: [
            {
                field: null,
                message: "Too many requests. Please wait a moment and try again.",
            },
        ],
    });
};

/**
 * authLimiter — tight limit for authentication endpoints.
 * 10 requests per 15 minutes per IP.
 * Applied to: POST /login, POST /signup
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,  // Return rate-limit info in `RateLimit-*` headers
    legacyHeaders: false,
    handler: rateLimitHandler,
    skipSuccessfulRequests: false,
});

/**
 * aiLimiter — moderate limit for AI-powered endpoints.
 * 20 requests per minute per IP. Prevents accidental Groq API bill spikes.
 * Applied to: POST /ai/categorise, POST /agent/ai-suggest
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

/**
 * generalLimiter — loose limit for general API routes.
 * 100 requests per 15 minutes per IP. Prevents scraping/DoS.
 * Applied to: ticket routes
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});

module.exports = { authLimiter, aiLimiter, generalLimiter };
