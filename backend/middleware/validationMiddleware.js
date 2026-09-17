const { body, param, query, validationResult } = require('express-validator');

/**
 * OWASP A03:2021 – Injection Protection
 * Input validation middleware to prevent injection attacks
 */

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// User registration validation
const validateRegistration = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    handleValidationErrors
];

// User login validation
const validateLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address'),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    handleValidationErrors
];

// Product creation/update validation
const validateProduct = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Product name must be between 3 and 200 characters')
        .escape(),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('Description must not exceed 5000 characters')
        .escape(),

    body('price')
        .isFloat({ min: 0, max: 1000000 })
        .withMessage('Price must be a positive number and less than 1,000,000'),

    body('quantity')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Quantity must be a non-negative integer'),

    body('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Category must not exceed 50 characters')
        .escape(),

    handleValidationErrors
];

// Order validation
const validateOrder = [
    body('orderItems')
        .isArray({ min: 1 })
        .withMessage('Order must contain at least one item'),

    body('orderItems.*.product')
        .isMongoId()
        .withMessage('Invalid product ID'),

    body('orderItems.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Quantity must be at least 1'),

    body('shippingAddress.address')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be between 5 and 200 characters')
        .escape(),

    body('shippingAddress.city')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('City must be between 2 and 50 characters')
        .escape(),

    body('shippingAddress.postalCode')
        .trim()
        .matches(/^[0-9]{6}$/)
        .withMessage('Postal code must be 6 digits'),

    body('shippingAddress.country')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Country must be between 2 and 50 characters')
        .escape(),

    handleValidationErrors
];

// Review validation
const validateReview = [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),

    body('comment')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Comment must not exceed 1000 characters')
        .escape(),

    handleValidationErrors
];

// Contact/Inquiry validation
const validateInquiry = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address'),

    body('subject')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Subject must not exceed 200 characters')
        .escape(),

    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters')
        .escape(),

    handleValidationErrors
];

// MongoDB ID validation
const validateMongoId = (paramName = 'id') => [
    param(paramName)
        .isMongoId()
        .withMessage('Invalid ID format'),

    handleValidationErrors
];

// Query parameter validation for pagination
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    handleValidationErrors
];

// Coupon code validation
const validateCoupon = [
    body('code')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Coupon code must be between 3 and 20 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('Coupon code can only contain uppercase letters and numbers'),

    body('discount')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Discount must be between 0 and 100'),

    handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    handleValidationErrors
];

// Email validation
const validateEmail = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address'),

    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateProduct,
    validateOrder,
    validateReview,
    validateInquiry,
    validateMongoId,
    validatePagination,
    validateCoupon,
    validatePasswordReset,
    validateEmail,
    handleValidationErrors
};
