const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { protect, admin } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    getRefreshTokenFromCookie,
} = require('../services/tokenService');
const { marketplaceConfig } = require('../config/marketplace.config');

// Security middleware
const { loginLimiter, registerLimiter } = require('../middleware/securityMiddleware');
const {
    validateRegistration,
    validateLogin,
    validateEmail,
    validatePasswordReset
} = require('../middleware/validationMiddleware');
const { securityLogger, authLogger } = require('../middleware/securityLogger');

// Apply auth logger to all routes
router.use(authLogger);

// Generate JWT — uses tokenService
const generateToken = (id, role) => {
    return generateAccessToken(id, role);
};

// @desc    Get all users with stats
// @route   GET /api/auth/users
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: { orders: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const usersWithStats = users.map((u) => ({
            _id: u.id,
            id: u.id,
            name: u.name,
            email: u.email,
            isAdmin: u.isAdmin,
            role: u.role.toLowerCase(),
            isBlocked: u.isBlocked,
            totalOrders: u._count.orders,
            lastLogin: u.lastLogin,
            createdAt: u.createdAt,
        }));

        res.json(usersWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Helper to verify an OTP for a given identifier and type
const verifyOtpForIdentifier = async (identifier, type, plainOtp) => {
    const normalized =
        type === 'email' ? identifier.toLowerCase().trim() : identifier.trim();

    let otpDoc = await prisma.oTP.findFirst({
        where: { identifier: normalized, type },
        orderBy: { createdAt: 'desc' },
    });

    // Resilient fallback: match Gmail addresses that may differ only by dots in username
    if (!otpDoc && type === 'email') {
        const [localPart, domain] = normalized.split('@');
        if (domain) {
            const activeOtps = await prisma.oTP.findMany({
                where: {
                    type: 'email',
                    expiresAt: { gt: new Date() },
                },
                orderBy: { createdAt: 'desc' },
            });
            otpDoc = activeOtps.find((doc) => {
                const [docLocal, docDomain] = doc.identifier.toLowerCase().trim().split('@');
                if (docDomain !== domain) return false;
                return docLocal.replace(/\./g, '') === localPart.replace(/\./g, '');
            });
        }
    }

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
        if (otpDoc) {
            await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});
        }
        throw new Error('OTP is invalid or has expired');
    }

    const MAX_VERIFICATION_ATTEMPTS = 3;
    if (otpDoc.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});
        throw new Error(
            'Maximum verification attempts exceeded. Please request a new OTP.'
        );
    }

    const isMatch = await bcrypt.compare(String(plainOtp).trim(), otpDoc.otp);
    if (!isMatch) {
        await prisma.oTP.update({
            where: { id: otpDoc.id },
            data: { attempts: otpDoc.attempts + 1 },
        });
        throw new Error('Invalid OTP');
    }

    await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', registerLimiter, validateRegistration, async (req, res) => {
    const { name, email, password, phone, emailOtp, phoneOtp } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const userExists = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (userExists) {
            securityLogger.logSuspiciousActivity(
                'DUPLICATE_REGISTRATION',
                { email },
                ip,
                req.get('user-agent')
            );
            return res.status(400).json({ message: 'User already exists' });
        }

        if (!emailOtp) {
            return res.status(400).json({ message: 'Email OTP is required' });
        }

        try {
            await verifyOtpForIdentifier(email, 'email', emailOtp);
        } catch (otpError) {
            return res.status(400).json({ message: otpError.message });
        }

        let isPhoneVerified = false;
        if (phone && phoneOtp) {
            try {
                await verifyOtpForIdentifier(phone, 'phone', phoneOtp);
                isPhoneVerified = true;
            } catch (otpError) {
                return res.status(400).json({ message: otpError.message });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                phone: phone || null,
                isEmailVerified: true,
                isPhoneVerified,
                role: 'CUSTOMER',
            },
        });

        securityLogger.logRegistration(true, email, ip);

        const roleStr = user.role.toLowerCase();
        const accessToken = generateAccessToken(user.id, roleStr);
        const refreshToken = generateRefreshToken(user.id);
        setRefreshTokenCookie(res, refreshToken);

        res.status(201).json({
            _id: user.id,
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            role: roleStr,
            cart: user.cart || [],
            token: accessToken,
            accessToken,
        });
    } catch (error) {
        securityLogger.logError(error, 'Registration', null, ip);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', loginLimiter, validateLogin, async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        if (!user) {
            securityLogger.logFailedAuth(email, ip, 'User not found');
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if account is blocked
        if (user.isBlocked) {
            securityLogger.logFailedAuth(email, ip, 'Account blocked');
            return res.status(403).json({
                message: 'Account has been blocked. Please contact support.',
                code: 'ACCOUNT_BLOCKED',
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            securityLogger.logFailedAuth(email, ip, 'Invalid password');
            return res.status(401).json({
                message: 'Invalid email or password',
            });
        }

        // Successful login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                failedLoginAttempts: 0,
                accountLockUntil: null,
                lastLogin: new Date(),
            },
        });

        securityLogger.logLogin(true, email, ip, req.get('user-agent'));

        const roleStr = user.role.toLowerCase();
        const accessToken = generateAccessToken(user.id, roleStr);
        const refreshToken = generateRefreshToken(user.id);
        setRefreshTokenCookie(res, refreshToken);

        res.json({
            _id: user.id,
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            role: roleStr,
            cart: user.cart || [],
            token: accessToken,
            accessToken,
        });
    } catch (error) {
        console.error(error);
        securityLogger.logError(error, 'Login', null, ip);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile and /api/v1/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                addresses: true,
                isAdmin: true,
                role: true,
                cart: true,
                wishlist: true,
                notificationPreferences: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const roleStr = user.role ? user.role.toLowerCase() : 'customer';
        res.json({
            _id: user.id,
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            addresses: user.addresses || [],
            isAdmin: user.isAdmin,
            role: roleStr,
            cart: user.cart || [],
            wishlist: user.wishlist || [],
            notificationPreferences: user.notificationPreferences,
            createdAt: user.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { name, email, phone, emailOtp, phoneOtp, addresses, notificationPreferences } = req.body;
        const updateData = {};

        if (name) updateData.name = name;

        // Handle email change with OTP verification
        if (email && email.toLowerCase() !== user.email) {
            if (!emailOtp) {
                return res.status(400).json({ message: 'Email OTP is required to change email address' });
            }
            try {
                await verifyOtpForIdentifier(email, 'email', emailOtp);
            } catch (otpError) {
                return res.status(400).json({ message: otpError.message });
            }
            updateData.email = email.toLowerCase().trim();
            updateData.isEmailVerified = true;
        }

        // Handle phone change with OTP verification
        if (phone && phone !== user.phone) {
            if (!phoneOtp) {
                return res.status(400).json({ message: 'Phone OTP is required to change phone number' });
            }
            try {
                await verifyOtpForIdentifier(phone, 'phone', phoneOtp);
            } catch (otpError) {
                return res.status(400).json({ message: otpError.message });
            }
            updateData.phone = phone;
            updateData.isPhoneVerified = true;
        }

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(req.body.password, salt);
        }
        if (addresses) {
            updateData.addresses = addresses;
        }
        if (notificationPreferences) {
            updateData.notificationPreferences = notificationPreferences;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        const roleStr = updatedUser.role.toLowerCase();
        res.json({
            _id: updatedUser.id,
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            addresses: updatedUser.addresses,
            isAdmin: updatedUser.isAdmin,
            role: roleStr,
            cart: updatedUser.cart || [],
            token: generateToken(updatedUser.id, roleStr),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get user wishlist
// @route   GET /api/auth/wishlist
// @access  Private
router.get('/wishlist', protect, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { wishlist: true },
        });

        if (!user || !user.wishlist.length) {
            return res.json([]);
        }

        const products = await prisma.product.findMany({
            where: { id: { in: user.wishlist } },
            select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                compareAtPrice: true,
                image: true,
                category: true,
                rating: true,
                isPublic: true,
            },
        });

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Toggle wishlist item
// @route   POST /api/auth/wishlist/:id
// @access  Private
router.post('/wishlist/:id', protect, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { wishlist: true },
        });

        const productId = req.params.id;
        let updatedWishlist = user.wishlist || [];

        if (updatedWishlist.includes(productId)) {
            updatedWishlist = updatedWishlist.filter((id) => id !== productId);
        } else {
            updatedWishlist.push(productId);
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { wishlist: updatedWishlist },
        });

        res.json({
            message: updatedWishlist.includes(productId) ? 'Product added to wishlist' : 'Product removed from wishlist',
            wishlist: updatedWishlist,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
router.delete('/profile', protect, async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.user.id } });
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Forgot Password
// @route   POST /api/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email: (email || '').toLowerCase().trim() },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes

        await prisma.user.update({
            where: { id: user.id },
            data: { resetPasswordToken, resetPasswordExpire },
        });

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
        const message = `
            <h1>Password Reset Request</h1>
            <p>Please click this link to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
        `;

        if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
            return res.json({
                message: 'Password reset link generated (Development Mode)',
                resetUrl,
            });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const brandName = process.env.FSO_BRAND_NAME || marketplaceConfig.brand.name;
            const fromEmail = process.env.FSO_ADMIN_EMAIL || process.env.EMAIL_USER;

            await transporter.sendMail({
                from: `${brandName} <${fromEmail}>`,
                to: user.email,
                subject: `${brandName} — Password Reset Request`,
                html: message,
            });

            res.json({ message: 'Password reset email sent successfully' });
        } catch (error) {
            console.error('Email sending error:', error);
            await prisma.user.update({
                where: { id: user.id },
                data: { resetPasswordToken: null, resetPasswordExpire: null },
            });
            return res.status(500).json({ message: 'Email could not be sent. Please try again later.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reset Password
// @route   PUT /api/auth/resetpassword/:resetToken
// @access  Public
router.put('/resetpassword/:resetToken', async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    try {
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid Token or Token Expired' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpire: null,
            },
        });

        const roleStr = user.role.toLowerCase();
        res.json({
            success: true,
            token: generateToken(user.id, roleStr),
            message: 'Password Reset Success',
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (uses httpOnly cookie or body token)
router.post('/refresh', async (req, res) => {
    const refreshToken = getRefreshTokenFromCookie(req) || req.body.refreshToken;
    const ip = req.ip || req.connection.remoteAddress;

    if (!refreshToken) {
        return res.status(401).json({
            success: false,
            message: 'Refresh token not provided',
            code: 'NO_REFRESH_TOKEN',
        });
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user || user.isBlocked) {
            clearRefreshTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'User not found or account blocked',
                code: 'INVALID_USER',
            });
        }

        const roleStr = user.role.toLowerCase();
        const newAccessToken = generateAccessToken(user.id, roleStr);
        const newRefreshToken = generateRefreshToken(user.id);
        setRefreshTokenCookie(res, newRefreshToken);

        res.json({
            success: true,
            accessToken: newAccessToken,
            token: newAccessToken,
        });
    } catch (error) {
        clearRefreshTokenCookie(res);
        securityLogger.logFailedAuth('unknown', ip, 'Invalid or expired refresh token: ' + error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            code: 'INVALID_REFRESH_TOKEN',
        });
    }
});

// @desc    Logout user & clear refresh token
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
    clearRefreshTokenCookie(res);
    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

module.exports = router;
