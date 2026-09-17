const fs = require('fs');
const path = require('path');

/**
 * OWASP A09:2021 – Security Logging and Monitoring Failures
 * Comprehensive security logging system
 */

class SecurityLogger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getLogFilePath(type) {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${type}-${date}.log`);
    }

    formatLogEntry(level, type, data) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            type,
            ...data
        }) + '\n';
    }

    writeLog(type, level, data) {
        const logEntry = this.formatLogEntry(level, type, data);
        const logFile = this.getLogFilePath(type);

        fs.appendFile(logFile, logEntry, (err) => {
            if (err) {
                console.error('Failed to write log:', err);
            }
        });

        // Also log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${level}] ${type}:`, data);
        }
    }

    // Authentication events
    logLogin(success, email, ip, userAgent) {
        this.writeLog('auth', success ? 'INFO' : 'WARN', {
            event: 'LOGIN_ATTEMPT',
            success,
            email,
            ip,
            userAgent
        });
    }

    logLogout(email, ip) {
        this.writeLog('auth', 'INFO', {
            event: 'LOGOUT',
            email,
            ip
        });
    }

    logRegistration(email, ip, userAgent) {
        this.writeLog('auth', 'INFO', {
            event: 'USER_REGISTRATION',
            email,
            ip,
            userAgent
        });
    }

    logPasswordReset(email, ip, success) {
        this.writeLog('auth', 'INFO', {
            event: 'PASSWORD_RESET',
            email,
            ip,
            success
        });
    }

    logFailedAuth(email, ip, reason) {
        this.writeLog('auth', 'WARN', {
            event: 'FAILED_AUTHENTICATION',
            email,
            ip,
            reason
        });
    }

    // Access Control events
    logUnauthorizedAccess(userId, resource, ip, userAgent) {
        this.writeLog('access', 'WARN', {
            event: 'UNAUTHORIZED_ACCESS',
            userId,
            resource,
            ip,
            userAgent
        });
    }

    logAdminAccess(userId, action, ip) {
        this.writeLog('access', 'INFO', {
            event: 'ADMIN_ACTION',
            userId,
            action,
            ip
        });
    }

    // Security events
    logSuspiciousActivity(type, details, ip, userAgent) {
        this.writeLog('security', 'CRITICAL', {
            event: 'SUSPICIOUS_ACTIVITY',
            type,
            details,
            ip,
            userAgent
        });
    }

    logRateLimitExceeded(ip, endpoint, userAgent) {
        this.writeLog('security', 'WARN', {
            event: 'RATE_LIMIT_EXCEEDED',
            ip,
            endpoint,
            userAgent
        });
    }

    logInjectionAttempt(type, payload, ip, userAgent) {
        this.writeLog('security', 'CRITICAL', {
            event: 'INJECTION_ATTEMPT',
            type,
            payload,
            ip,
            userAgent
        });
    }

    // Data events
    logDataAccess(userId, resource, action, ip) {
        this.writeLog('data', 'INFO', {
            event: 'DATA_ACCESS',
            userId,
            resource,
            action,
            ip
        });
    }

    logDataModification(userId, resource, action, changes, ip) {
        this.writeLog('data', 'INFO', {
            event: 'DATA_MODIFICATION',
            userId,
            resource,
            action,
            changes,
            ip
        });
    }

    logDataDeletion(userId, resource, id, ip) {
        this.writeLog('data', 'WARN', {
            event: 'DATA_DELETION',
            userId,
            resource,
            id,
            ip
        });
    }

    // Error events
    logError(error, context, userId, ip) {
        this.writeLog('error', 'ERROR', {
            event: 'APPLICATION_ERROR',
            error: error.message,
            stack: error.stack,
            context,
            userId,
            ip
        });
    }

    // Payment events
    logPayment(userId, orderId, amount, status, ip) {
        this.writeLog('payment', 'INFO', {
            event: 'PAYMENT_TRANSACTION',
            userId,
            orderId,
            amount,
            status,
            ip
        });
    }

    logPaymentFailure(userId, orderId, amount, reason, ip) {
        this.writeLog('payment', 'WARN', {
            event: 'PAYMENT_FAILURE',
            userId,
            orderId,
            amount,
            reason,
            ip
        });
    }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

// Middleware to log all requests
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            userId: req.user ? req.user._id : 'anonymous'
        };

        if (res.statusCode >= 400) {
            securityLogger.writeLog('request', 'WARN', logData);
        } else if (process.env.LOG_ALL_REQUESTS === 'true') {
            securityLogger.writeLog('request', 'INFO', logData);
        }
    });

    next();
};

// Middleware to log authentication attempts
const authLogger = (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');

        if (req.path.includes('/login')) {
            securityLogger.logLogin(
                res.statusCode === 200,
                req.body.email,
                ip,
                userAgent
            );
        } else if (req.path.includes('/register')) {
            if (res.statusCode === 201) {
                securityLogger.logRegistration(req.body.email, ip, userAgent);
            }
        } else if (req.path.includes('/resetpassword') || req.path.includes('/forgotpassword')) {
            securityLogger.logPasswordReset(
                req.body.email || 'unknown',
                ip,
                res.statusCode === 200
            );
        }

        return originalJson(data);
    };

    next();
};

module.exports = {
    securityLogger,
    requestLogger,
    authLogger
};
