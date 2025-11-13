const rateLimit = require('express-rate-limit');

// Payment creation rate limit
exports.paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 payment requests per 15 minutes
    message: {
        success: false,
        message: 'Too many payment requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// IPN rate limit (more lenient)
exports.ipnRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 IPN calls per minute
    message: {
        RspCode: '97',
        Message: 'Too many requests'
    }
});