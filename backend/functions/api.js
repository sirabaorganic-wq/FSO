const serverless = require('serverless-http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('../config/db');

const authRoutes = require('../routes/authRoutes');
const productRoutes = require('../routes/productRoutes');
const orderRoutes = require('../routes/orderRoutes');
const cartRoutes = require('../routes/cartRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const inquiryRoutes = require('../routes/inquiryRoutes');
const couponRoutes = require('../routes/couponRoutes');
const b2bRoutes = require('../routes/b2bRoutes');
const contactRoutes = require('../routes/contactRoutes');

dotenv.config();

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'https://rad-kringle-188297.netlify.app',
    process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        // Check if origin is allowed
        const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o));

        if (isAllowed) {
            callback(null, true);
        } else {
            // Fallback for development/testing ease
            console.log('CORS looser check for:', origin);
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Middleware to ensure DB connection before each request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(503).json({
            message: 'Database connection failed. Please try again later.',
            error: error.message
        });
    }
});

// Routes
// IMPORTANT: Netlify functions are served under /.netlify/functions/api
// We need the router to understand this prefix OR use a router that handles relative paths.
const router = express.Router();

router.get('/', (req, res) => {
    res.send('API is running...');
});

router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected (Prisma / Neon PostgreSQL)',
    });
});

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/cart', cartRoutes);
router.use('/upload', uploadRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/coupons', couponRoutes);
router.use('/b2b', b2bRoutes);
router.use('/contact', contactRoutes);

// Mount the router at the path used by Netlify Functions
app.use('/.netlify/functions/api', router);
// Also mount at /api for local testing compatibility
app.use('/api', router);


// Export for Serverless
module.exports.handler = serverless(app);
