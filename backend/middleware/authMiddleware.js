const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { securityLogger } = require('./securityLogger');

/**
 * OWASP A01:2021 – Broken Access Control
 * OWASP A07:2021 – Identification and Authentication Failures
 * FSO Authentication & Authorization Middleware
 *
 * SECURITY: JWT_SECRET MUST be set via environment variable.
 * Application will crash at startup if missing (validated in marketplace.config.js).
 * The previous 'secret123' fallback has been intentionally removed.
 */

// Helper: get JWT secret — no fallback allowed
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // This should never happen in runtime because validateRequiredSecrets() runs at startup.
        // Belt-and-suspenders safety.
        throw new Error('JWT_SECRET is not configured. Application cannot authenticate users.');
    }
    return secret;
};

const protect = async (req, res, next) => {
    let token;
    const ip = req.ip || req.connection.remoteAddress;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, getJwtSecret());

            // Check if token is expired
            if (decoded.exp && decoded.exp < Date.now() / 1000) {
                securityLogger.logFailedAuth('unknown', ip, 'Token expired');
                return res.status(401).json({
                    message: 'Not authorized, token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }

            // Fetch user and exclude sensitive fields via Prisma
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
            });

            if (!user) {
                securityLogger.logFailedAuth(decoded.id, ip, 'User not found');
                return res.status(401).json({
                    message: 'Not authorized, user not found',
                    code: 'USER_NOT_FOUND'
                });
            }

            delete user.password;
            delete user.resetPasswordToken;
            delete user.resetPasswordExpire;
            user._id = user.id;
            user.role = user.role.toLowerCase();
            req.user = user;

            // Check if user account is active
            if (req.user.isBlocked) {
                securityLogger.logFailedAuth(req.user.email, ip, 'Account blocked');
                return res.status(403).json({
                    message: 'Account has been blocked. Please contact support.',
                    code: 'ACCOUNT_BLOCKED'
                });
            }



            next();
        } catch (error) {
            console.error('Auth error:', error);

            if (error.name === 'JsonWebTokenError') {
                securityLogger.logFailedAuth('unknown', ip, 'Invalid token');
                return res.status(401).json({
                    message: 'Not authorized, token invalid',
                    code: 'INVALID_TOKEN'
                });
            }

            if (error.name === 'TokenExpiredError') {
                securityLogger.logFailedAuth('unknown', ip, 'Token expired');
                return res.status(401).json({
                    message: 'Not authorized, token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }

            return res.status(401).json({
                message: 'Not authorized, authentication failed',
                code: 'AUTH_FAILED'
            });
        }
    } else {
        securityLogger.logFailedAuth('unknown', ip, 'No token provided');
        return res.status(401).json({
            message: 'Not authorized, no token provided',
            code: 'NO_TOKEN'
        });
    }
};

/**
 * OWASP A01:2021 – Broken Access Control
 * Admin authorization middleware with logging
 */
const admin = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (req.user && req.user.isAdmin) {
        securityLogger.logAdminAccess(
            req.user._id,
            `${req.method} ${req.path}`,
            ip
        );
        next();
    } else {
        securityLogger.logUnauthorizedAccess(
            req.user ? req.user._id : 'unknown',
            `Admin: ${req.method} ${req.path}`,
            ip,
            req.get('user-agent')
        );
        return res.status(403).json({
            message: 'Not authorized as an admin',
            code: 'ADMIN_REQUIRED'
        });
    }
};

/**
 * OWASP A01:2021 – Broken Access Control
 * Middleware to check if user is accessing their own resources
 */
const ownResource = (paramName = 'id') => {
    return (req, res, next) => {
        const resourceId = req.params[paramName];
        const userId = req.user._id.toString();
        const ip = req.ip || req.connection.remoteAddress;

        // Admin can access any resource
        if (req.user.isAdmin) {
            return next();
        }

        // Check if user is accessing their own resource
        if (resourceId !== userId) {
            securityLogger.logUnauthorizedAccess(
                userId,
                `Resource: ${req.path}`,
                ip,
                req.get('user-agent')
            );
            return res.status(403).json({
                message: 'Not authorized to access this resource',
                code: 'FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * OWASP A01:2021 – Broken Access Control
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret());
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (user) {
                delete user.password;
                user._id = user.id;
                user.role = user.role.toLowerCase();
                req.user = user;
            } else {
                req.user = null;
            }
        } catch (e) {
            req.user = null;
        }
    }

    next();
};

const adminOrVendorOnboarder = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (req.user && (req.user.isAdmin || req.user.role === 'vendor_onboarder')) {
        next();
    } else {
        securityLogger.logUnauthorizedAccess(
            req.user ? req.user._id : 'unknown',
            `Admin/VendorOnboarder: ${req.method} ${req.path}`,
            ip,
            req.get('user-agent')
        );
        return res.status(403).json({
            message: 'Not authorized. Vendor Onboarder or Admin role required.',
            code: 'FORBIDDEN'
        });
    }
};

const adminOrBlogCreator = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (req.user && (req.user.isAdmin || req.user.role === 'blog_creator')) {
        next();
    } else {
        securityLogger.logUnauthorizedAccess(
            req.user ? req.user._id : 'unknown',
            `Admin/BlogCreator: ${req.method} ${req.path}`,
            ip,
            req.get('user-agent')
        );
        return res.status(403).json({
            message: 'Not authorized. Blog Creator or Admin role required.',
            code: 'FORBIDDEN'
        });
    }
};

const adminOrSubAdmin = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;

    if (req.user && (req.user.isAdmin || req.user.role === 'vendor_onboarder' || req.user.role === 'blog_creator')) {
        next();
    } else {
        securityLogger.logUnauthorizedAccess(
            req.user ? req.user._id : 'unknown',
            `Admin/SubAdmin: ${req.method} ${req.path}`,
            ip,
            req.get('user-agent')
        );
        return res.status(403).json({
            message: 'Not authorized. Sub-Admin or Admin role required.',
            code: 'FORBIDDEN'
        });
    }
};

/**
 * FSO Role-based authorization factory.
 * Usage: protect, hasRole(['content_editor', 'admin'])
 * @param {string[]} roles - array of allowed roles
 */
const hasRole = (...roles) => {
    const allowedRoles = (Array.isArray(roles[0]) ? roles[0] : roles).flat();
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;

        if (!req.user) {
            return res.status(401).json({
                message: 'Not authorized',
                code: 'AUTH_REQUIRED'
            });
        }

        // Admin always passes role checks
        if (req.user.isAdmin) return next();

        if (!allowedRoles.includes(req.user.role)) {
            securityLogger.logUnauthorizedAccess(
                req.user._id,
                `Role check failed (required: ${allowedRoles.join('|')}): ${req.method} ${req.path}`,
                ip,
                req.get('user-agent')
            );
            return res.status(403).json({
                message: `Not authorized. Required role: ${allowedRoles.join(' or ')}`,
                code: 'ROLE_FORBIDDEN'
            });
        }

        next();
    };
};

/**
 * FSO Producer (Vendor) authentication middleware.
 * Authenticates via Vendor model using the same JWT infrastructure.
 * Reads 'vendorId' from JWT payload (set during vendor login).
 */
const isProducer = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret());

            // Support both vendor-specific tokens (vendorId field) and legacy approach
            const vendorId = decoded.vendorId || decoded.id;
            const tokenType = decoded.tokenType || decoded.type;

            // Find vendor via Prisma
            const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
            if (vendor) {
                vendor._id = vendor.id;
                vendor.status = vendor.status.toLowerCase();
                req.vendor = vendor;
            } else {
                req.vendor = null;
            }

            if (!req.vendor) {
                return res.status(401).json({
                    message: 'Not authorized as a producer',
                    code: 'PRODUCER_NOT_FOUND'
                });
            }

            if (!req.vendor.isActive) {
                return res.status(403).json({
                    message: 'Producer account is inactive',
                    code: 'PRODUCER_INACTIVE'
                });
            }

            next();
        } catch (error) {
            securityLogger.logFailedAuth('unknown', ip, 'Producer auth failed: ' + error.message);
            return res.status(401).json({
                message: 'Not authorized, authentication failed',
                code: 'AUTH_FAILED'
            });
        }
    } else {
        return res.status(401).json({
            message: 'Not authorized, no token provided',
            code: 'NO_TOKEN'
        });
    }
};

/**
 * Ensure the authenticated producer has 'approved' status.
 * Must be used AFTER isProducer middleware.
 */
const isProducerApproved = (req, res, next) => {
    if (!req.vendor) {
        return res.status(401).json({
            message: 'Producer authentication required',
            code: 'PRODUCER_AUTH_REQUIRED'
        });
    }

    if (req.vendor.status !== 'approved') {
        return res.status(403).json({
            message: `Producer account status is '${req.vendor.status}'. Approval required to access this resource.`,
            code: 'PRODUCER_NOT_APPROVED'
        });
    }

    next();
};

module.exports = {
    protect,
    admin,
    ownResource,
    optionalAuth,
    adminOrVendorOnboarder,
    adminOrBlogCreator,
    adminOrSubAdmin,
    // FSO additions:
    hasRole,
    isProducer,
    isProducerApproved,
};
