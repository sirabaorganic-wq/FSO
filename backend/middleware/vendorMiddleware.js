const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// Protect vendor routes
const protectVendor = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ message: "Authentication configuration error: JWT_SECRET missing" });
      }
      const decoded = jwt.verify(token, secret);

      const userId = decoded.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authorized, invalid token payload" });
      }

      // 1. Authoritative User lookup
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ message: "Account is blocked" });
      }

      // 2. Strict RBAC Boundary
      const normalizedRole = (user.role || "").toUpperCase();
      if (normalizedRole === "CUSTOMER") {
        return res.status(403).json({ message: "Access forbidden: Customers cannot access vendor portal" });
      }

      if (normalizedRole !== "PRODUCER_MANAGER") {
        return res.status(403).json({ message: "Access forbidden: Requires PRODUCER_MANAGER role. Admins must use /api/v1/admin routes." });
      }

      // 3. Resolve Vendor by User email or decoded vendorId
      let vendor = null;
      if (decoded.vendorId) {
        vendor = await prisma.vendor.findUnique({
          where: { id: decoded.vendorId },
        });
        if (vendor && vendor.email !== user.email) {
          return res.status(403).json({ message: "Access forbidden: Vendor token mismatch" });
        }
      }

      if (!vendor && user.email) {
        vendor = await prisma.vendor.findUnique({
          where: { email: user.email },
        });
      }

      if (!vendor) {
        return res.status(403).json({ message: "Vendor account not found for this user" });
      }

      // 4. Check active and approved status
      if (!vendor.isActive) {
        return res.status(403).json({ message: "Vendor account is inactive" });
      }

      const normalizedStatus = (vendor.status || "").toUpperCase();
      if (normalizedStatus !== "APPROVED") {
        return res.status(403).json({
          message: `Vendor account is ${vendor.status.toLowerCase()}`,
          status: vendor.status.toLowerCase(),
        });
      }

      vendor._id = vendor.id;
      vendor.status = vendor.status.toLowerCase();
      req.user = user;
      req.vendor = vendor;

      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Not authorized, token failed" });
      }
      console.error("protectVendor error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Check if vendor is approved
const approvedVendor = (req, res, next) => {
  if (req.vendor && req.vendor.status === "approved") {
    next();
  } else {
    res.status(403).json({
      message: "Vendor account not yet approved",
      status: req.vendor?.status || "unknown",
    });
  }
};

// Check if vendor onboarding is complete
const onboardingComplete = (req, res, next) => {
  if (req.vendor && req.vendor.onboardingComplete) {
    next();
  } else {
    res.status(403).json({
      message: "Please complete onboarding first",
      onboardingStep: req.vendor?.onboardingStep || 1,
    });
  }
};

// Check if vendor has at least one organic certification
const certifiedVendor = (req, res, next) => {
  if (
    req.vendor &&
    req.vendor.certifications &&
    req.vendor.certifications.length > 0
  ) {
    next();
  } else {
    res.status(403).json({
      message:
        "Vendor must have at least one organic certification (USDA Organic, EU Organic, or NPOP) to list products",
      certifications: req.vendor?.certifications || [],
    });
  }
};

module.exports = { protectVendor, approvedVendor, onboardingComplete, certifiedVendor };
