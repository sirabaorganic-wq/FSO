const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Load environment variables FIRST before importing any config or routes
dotenv.config();

// FSO marketplace config — validates required secrets at startup
const { validateRequiredSecrets } = require("./config/marketplace.config");
validateRequiredSecrets();

const connectDB = require("./config/db");

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const couponRoutes = require("./routes/couponRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const otpRoutes = require("./routes/otpRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const razorpayWebhookRoutes = require("./routes/razorpayWebhookRoutes");
const shiprocketRoutes = require("./routes/shiprocketRoutes");

// ── FSO new routes ────────────────────────────────────────────────────────────
const articleRoutes = require("./routes/articleRoutes");
const recipeRoutes = require("./routes/recipeRoutes");
const ingredientRoutes = require("./routes/ingredientRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const producerRoutes = require("./routes/producerRoutes");
const searchRoutes = require("./routes/searchRoutes");

// ── Security middleware ───────────────────────────────────────────────────────
const {
  securityHeaders,
  mongoSanitizeMiddleware,
  xssProtection,
  apiLimiter,
  parameterPollutionProtection,
  hidePoweredBy,
  suspiciousActivityLogger,
  preventDirectoryTraversal,
} = require("./middleware/securityMiddleware");
const { requestLogger } = require("./middleware/securityLogger");
const { notFoundHandler, globalErrorHandler } = require("./middleware/errorMiddleware");

const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

// ── CORS Configuration (FSO — no hardcoded Siraba/Netlify origins) ───────────
//
// SECURITY FIX: The previous implementation called callback(null, true) for
// ALL origins, including those not in the allowlist — effectively disabling CORS.
// This has been fixed: unknown origins now receive a CORS error.
//
// Configure via env var: CORS_ORIGINS=https://domain1.com,https://domain2.com
const buildAllowedOrigins = () => {
  const origins = new Set([
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:5001",
  ]);

  // Add origins from environment variable (comma-separated)
  if (process.env.CORS_ORIGINS) {
    process.env.CORS_ORIGINS.split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean)
      .forEach((o) => origins.add(o));
  }

  // Add CLIENT_URL if set
  if (process.env.CLIENT_URL) origins.add(process.env.CLIENT_URL.trim().replace(/\/+$/, ""));

  return [...origins];
};

const allowedOrigins = buildAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Requests with no Origin header (e.g. server-to-server, SSR, health checks, curl).
    // In accordance with security policy, do not automatically treat as a trusted browser origin
    // and do NOT emit permissive Access-Control-Allow-Origin headers.
    if (!origin) return callback(null, false);

    // Explicitly reject opaque 'null' string origin (sandboxed iframes, data URLs)
    if (origin === "null") {
      console.warn(`[CORS] Blocked request from opaque 'null' origin`);
      return callback(new Error(`CORS policy: Origin 'null' not allowed`));
    }

    // Strict allowlist equality check — eliminates prefix, suffix, and subdomain bypasses
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// ==================== SECURITY MIDDLEWARE ====================

// Security headers (helmet) — first
app.use(securityHeaders());
app.use(hidePoweredBy);

// Enable CORS
app.use(cors(corsOptions));

// ==================== WEBHOOK ROUTES (Requires Raw Body) ====================
// CRITICAL: Webhooks MUST be mounted BEFORE express.json() is called.
// Raw body must be preserved for Razorpay/Shiprocket signature validation.
app.use("/webhooks/razorpay", razorpayWebhookRoutes);

// Body parsers (after webhooks)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser (required for httpOnly refresh token cookies)
app.use(cookieParser());

// NoSQL injection sanitization
app.use(mongoSanitizeMiddleware());

// XSS protection
app.use(xssProtection());

// HTTP Parameter Pollution prevention
app.use(parameterPollutionProtection());

// Request logging
app.use(requestLogger);

// Suspicious activity logging
app.use(suspiciousActivityLogger);

// Directory traversal prevention
app.use(preventDirectoryTraversal);

// Rate limiting on all API routes
app.use("/api/", apiLimiter);

// ==================== SOCKET.IO SETUP ====================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make io available in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  // Join a chat room (e.g., vendor messaging)
  socket.on("join_chat", (room) => {
    socket.join(room);
  });

  socket.on("typing", (room) => {
    socket.to(room).emit("typing");
  });

  socket.on("stop_typing", (room) => {
    socket.to(room).emit("stop_typing");
  });

  io.emit("activeUsers", io.engine.clientsCount);

  socket.on("disconnect", () => {
    io.emit("activeUsers", io.engine.clientsCount);
  });
});

// ==================== API ROUTES ====================
//
// Strategy: FSO uses /api/v1/ for new routes.
// Legacy /api/ routes are preserved for existing frontend compatibility.
// In Phase 12, frontend hooks will be updated to use /api/v1/ paths.

// ── Health & Status ─────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ name: "FSO Marketplace API", version: "1.0.0", status: "running" });
});

const prisma = require("./config/prisma");

const getHealthStatus = async (req, res) => {
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = "disconnected: " + err.message;
  }

  const isHealthy = dbStatus === "connected";
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? "UP" : "DEGRADED",
      service: "FSO Marketplace Backend",
      database: "PostgreSQL",
      databaseStatus: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    },
  });
};

app.get("/api/health", getHealthStatus);
app.get("/api/v1/health", getHealthStatus);

// ── Authentication ───────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/v1/auth", authRoutes); // FSO versioned

// ── Products ─────────────────────────────────────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/v1/products", productRoutes);

// ── Orders ───────────────────────────────────────────────────────────────────
app.use("/api/orders", orderRoutes);
app.use("/api/v1/orders", orderRoutes);

// ── Cart ─────────────────────────────────────────────────────────────────────
app.use("/api/cart", cartRoutes);
app.use("/api/v1/cart", cartRoutes);

// ── Uploads ──────────────────────────────────────────────────────────────────
app.use("/api/upload", uploadRoutes);
app.use("/api/v1/upload", uploadRoutes);

// ── Coupons ──────────────────────────────────────────────────────────────────
app.use("/api/coupons", couponRoutes);
app.use("/api/v1/coupons", couponRoutes);

// ── Invoices ─────────────────────────────────────────────────────────────────
app.use("/api/invoices", invoiceRoutes);
app.use("/api/v1/invoices", invoiceRoutes);

// ── Reviews ──────────────────────────────────────────────────────────────────
app.use("/api/reviews", reviewRoutes);
app.use("/api/v1/reviews", reviewRoutes);

// ── OTP ──────────────────────────────────────────────────────────────────────
app.use("/api/otp", otpRoutes);
app.use("/api/v1/otp", otpRoutes);

// ── Payment ──────────────────────────────────────────────────────────────────
app.use("/api/payment", paymentRoutes);
app.use("/api/v1/payment", paymentRoutes);

// ── Vendors / Producers ──────────────────────────────────────────────────────
app.use("/api/vendors", require("./routes/vendorRoutes"));
app.use("/api/v1/vendors", require("./routes/vendorRoutes")); // legacy alias
app.use("/api/v1/producers", producerRoutes);                  // FSO semantic route

// ── Vendor sub-routes ────────────────────────────────────────────────────────
app.use("/api/vendors/invoices", require("./routes/vendorInvoiceRoutes"));
app.use("/api/v1/vendors/invoices", require("./routes/vendorInvoiceRoutes"));
app.use("/api/vendor-messages", require("./routes/vendorMessageRoutes"));
app.use("/api/v1/vendor-messages", require("./routes/vendorMessageRoutes"));

// ── Notifications ────────────────────────────────────────────────────────────
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/v1/notifications", require("./routes/notificationRoutes"));

// ── Admin ────────────────────────────────────────────────────────────────────
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/admin", require("./routes/gstRoutes"));
app.use("/api/v1/admin", require("./routes/gstRoutes"));

// ── Refunds ──────────────────────────────────────────────────────────────────
app.use("/api/refunds", require("./routes/refundRoutes"));
app.use("/api/v1/refunds", require("./routes/refundRoutes"));

// ── GST ──────────────────────────────────────────────────────────────────────
app.use("/api/gst", require("./routes/publicGSTRoutes"));
app.use("/api/v1/gst", require("./routes/publicGSTRoutes"));

// ── Shipping / Shiprocket ────────────────────────────────────────────────────
app.use("/api/shiprocket", shiprocketRoutes);
app.use("/api/v1/shipping", require("./routes/shippingRoutes"));
app.use("/api/shipping", require("./routes/shippingRoutes"));

const shiprocketWebhookRoutes = require("./routes/shiprocketWebhookRoutes");
app.use("/api/fulfillment/status", shiprocketWebhookRoutes);
app.use("/api/shiprocket/webhook", shiprocketWebhookRoutes);

// ── Settings ─────────────────────────────────────────────────────────────────
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/v1/settings", require("./routes/settingsRoutes"));

// ── Contact ──────────────────────────────────────────────────────────────────
app.use("/api/contact", require("./routes/contactRoutes"));
app.use("/api/v1/contact", require("./routes/contactRoutes"));

// ── Blog (legacy) — kept for backward compat ─────────────────────────────────
app.use("/api/blogs", require("./routes/blogRoutes"));

// ── Verification ─────────────────────────────────────────────────────────────
app.use("/api/verification", require("./routes/verificationRoutes"));
app.use("/api/v1/verification", require("./routes/verificationRoutes"));

// ── Cache ────────────────────────────────────────────────────────────────────
app.use("/api/cache", require("./routes/cacheRoutes"));

// ── B2B (feature-flagged, preserved for backward compat) ─────────────────────
app.use("/api/b2b", require("./routes/b2bRoutes"));

// ── Inquiries ────────────────────────────────────────────────────────────────
app.use("/api/inquiries", inquiryRoutes);

// ── FSO Content APIs (new in Phase 11) ───────────────────────────────────────
app.use("/api/v1/articles", articleRoutes);
app.use("/api/v1/recipes", recipeRoutes);
app.use("/api/v1/ingredients", ingredientRoutes);
app.use("/api/v1/collections", collectionRoutes);
app.use("/api/v1/banners", bannerRoutes);
app.use("/api/v1/search", searchRoutes);

// ==================== ERROR HANDLING (must be LAST) ====================
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`\n🚀 FSO Marketplace Backend running on port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`   API v1: http://localhost:${PORT}/api/v1`);
      console.log(`   Health: http://localhost:${PORT}/api/v1/health\n`);
    });
  } catch (error) {
    console.error("Failed to start FSO server:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer, corsOptions, allowedOrigins, buildAllowedOrigins };
