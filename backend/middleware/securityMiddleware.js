const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');

/**
 * OWASP A03:2021 – Injection Protection
 * Custom NoSQL injection sanitization (Express 5 compatible)
 */
const sanitizeValue = (value) => {
    if (value && typeof value === 'object') {
        // Recursively sanitize objects
        const sanitized = Array.isArray(value) ? [] : {};
        for (const key in value) {
            // Remove keys that start with $ or contain .
            if (key.startsWith('$') || key.includes('.')) {
                console.warn(`Sanitized NoSQL injection attempt: ${key}`);
                continue;
            }
            sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
    }
    return value;
};

const mongoSanitizeMiddleware = () => {
    return (req, res, next) => {
        // Sanitize request body
        if (req.body) {
            req.body = sanitizeValue(req.body);
        }

        // Sanitize request params
        if (req.params) {
            for (const key in req.params) {
                if (typeof req.params[key] === 'string') {
                    // Remove $ and . from params
                    req.params[key] = req.params[key].replace(/[$\.]/g, '');
                }
            }
        }

        // Note: In Express 5, req.query is read-only, so we can't sanitize it directly
        // Instead, we'll validate in the validation middleware

        next();
    };
};

/**
 * OWASP A03:2021 – Injection Protection (XSS)
 * Custom XSS protection middleware (Express 5 compatible)
 */
const xssClean = (str) => {
    if (typeof str !== 'string') return str;

    // Remove potentially dangerous HTML/JS
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>/gi, '');
};

const xssCleanValue = (value) => {
    if (typeof value === 'string') {
        return xssClean(value);
    }
    if (value && typeof value === 'object') {
        const cleaned = Array.isArray(value) ? [] : {};
        for (const key in value) {
            cleaned[key] = xssCleanValue(value[key]);
        }
        return cleaned;
    }
    return value;
};

const xssProtection = () => {
    return (req, res, next) => {
        // Clean request body
        if (req.body) {
            req.body = xssCleanValue(req.body);
        }

        // Clean request params
        if (req.params) {
            for (const key in req.params) {
                if (typeof req.params[key] === 'string') {
                    req.params[key] = xssClean(req.params[key]);
                }
            }
        }

        // Note: req.query is read-only in Express 5

        next();
    };
};

/**
 * OWASP A05:2021 – Security Misconfiguration
 * Set security HTTP headers using Helmet
 */
const securityHeaders = () => {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        frameguard: {
            action: 'deny'
        },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin'
        }
    });
};

/**
 * OWASP A07:2021 – Identification and Authentication Failures
 * Rate limiting for login to prevent brute force attacks.
 * Max 10 attempts per IP per 15 minutes.
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // max 10 login attempts per IP per window
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'LOGIN_RATE_LIMITED',
                message: 'Too many login attempts. Please try again after 15 minutes.',
            },
            retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
        });
    },
});

/**
 * OWASP A07:2021 – Identification and Authentication Failures
 * Rate limiting for registration to prevent spam
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 registrations per hour
    message: 'Too many accounts created from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'REGISTER_RATE_LIMITED',
                message: 'Too many registration attempts. Please try again after 1 hour.',
            },
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * OWASP A07:2021 – Identification and Authentication Failures
 * Rate limiting for OTP requests to prevent abuse.
 * Max 3 OTP requests per IP per 10 minutes.
 */
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // max 3 OTP requests per IP per window
    message: 'Too many OTP requests from this IP, please try again after 10 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'OTP_RATE_LIMITED',
                message: 'Too many OTP requests. Please try again after 10 minutes.',
            },
        });
    }
});

/**
 * OWASP A01:2021 – Broken Access Control
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests, please try again later',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

/**
 * OWASP A03:2021 – Injection
 * Prevent HTTP Parameter Pollution attacks
 */
const parameterPollutionProtection = () => {
    return hpp({
        whitelist: [
            'sort',
            'fields',
            'page',
            'limit',
            'category',
            'price',
            'rating'
        ]
    });
};

/**
 * OWASP A05:2021 – Security Misconfiguration
 * Disable X-Powered-By header to avoid revealing technology stack
 */
const hidePoweredBy = (req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
};

/**
 * OWASP A09:2021 – Security Logging and Monitoring Failures
 * Log suspicious activities
 */
const suspiciousActivityLogger = (req, res, next) => {
    // Log requests with suspicious patterns
    const suspiciousPatterns = [
        /(\.\.)|(\/\/)/,  // Path traversal
        /(<script|<iframe|javascript:)/i,  // XSS attempts
        /(\$where|\$ne|\$gt|\$lt)/,  // NoSQL injection
        /(union|select|insert|update|delete|drop)/i  // SQL injection
    ];

    const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(checkString)) {
            console.warn({
                timestamp: new Date().toISOString(),
                type: 'SUSPICIOUS_ACTIVITY',
                ip: req.ip,
                method: req.method,
                url: req.url,
                userAgent: req.get('user-agent'),
                body: req.body,
                query: req.query
            });
            break;
        }
    }

    next();
};

/**
 * OWASP A01:2021 – Broken Access Control
 * Prevent access to hidden/system files
 */
const preventDirectoryTraversal = (req, res, next) => {
    const suspiciousPath = /(\.\.)|(\/\/)|(%2e%2e)|(%2f%2f)/i;

    if (suspiciousPath.test(req.path)) {
        console.warn({
            timestamp: new Date().toISOString(),
            type: 'DIRECTORY_TRAVERSAL_ATTEMPT',
            ip: req.ip,
            url: req.url,
            userAgent: req.get('user-agent')
        });
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied'
        });
    }

    next();
};

module.exports = {
    mongoSanitizeMiddleware,
    xssProtection,
    securityHeaders,
    loginLimiter,
    registerLimiter,
    otpLimiter,
    apiLimiter,
    parameterPollutionProtection,
    hidePoweredBy,
    suspiciousActivityLogger,
    preventDirectoryTraversal
};
