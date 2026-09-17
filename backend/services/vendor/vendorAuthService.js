/**
 * FSO Vendor Authentication Service — Neon PostgreSQL via Prisma
 * Strictly adheres to Gate 3:
 * Reuses the authoritative User authentication model for credentials (password, role: "PRODUCER_MANAGER").
 * Vendor model stores business provenance & profile metadata.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const { generateAccessToken, generateRefreshToken } = require('../tokenService');

const generateUniqueVendorSlug = async (businessName) => {
  let baseSlug = (businessName || 'artisan-producer')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) baseSlug = 'artisan-producer';

  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.vendor.findUnique({
      where: { slug: candidate },
    });
    if (!existing) break;
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }

  return candidate;
};

/**
 * Register a new vendor with verified email OTP.
 */
const registerVendor = async (data) => {
  const {
    email,
    password,
    businessName,
    businessType,
    contactPerson,
    phone,
    city,
    state,
    postalCode,
    emailOtp,
  } = data;

  const normalizedEmail = email.toLowerCase().trim();

  const existingVendor = await prisma.vendor.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingVendor) {
    throw new Error('A vendor with this email address already exists');
  }

  // Verify OTP from Prisma
  if (!emailOtp) {
    throw new Error('Email OTP is required for vendor registration');
  }

  const otpDoc = await prisma.oTP.findFirst({
    where: { identifier: normalizedEmail, type: 'email' },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    if (otpDoc) await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});
    throw new Error('OTP is invalid or has expired');
  }

  const isMatch = await bcrypt.compare(String(emailOtp).trim(), otpDoc.otp);
  if (!isMatch) {
    await prisma.oTP.update({
      where: { id: otpDoc.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error('Invalid OTP');
  }

  await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});

  // Hash password for User record
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const slug = await generateUniqueVendorSlug(businessName);

  // Map business type
  const rawType = (businessType || 'artisan').toUpperCase();
  const validTypes = [
    'MANUFACTURER', 'DISTRIBUTOR', 'FARMER', 'PROCESSOR', 'WHOLESALER',
    'ARTISAN', 'COOPERATIVE', 'TRADITIONAL_PRODUCER', 'FAMILY_BUSINESS',
    'WOMEN_COLLECTIVE', 'OTHER',
  ];
  const mappedType = validTypes.includes(rawType) ? rawType : 'ARTISAN';

  // Create Vendor record
  const vendor = await prisma.vendor.create({
    data: {
      email: normalizedEmail,
      businessName: businessName.trim(),
      slug,
      businessType: mappedType,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      addressCity: (city || '').trim(),
      addressState: (state || '').trim(),
      addressPostalCode: (postalCode || '').trim(),
      addressCountry: 'India',
      status: 'APPROVED',
      isActive: true,
    },
  });

  // Create or update authoritative User record
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: contactPerson.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone.trim(),
        role: 'PRODUCER_MANAGER',
        businessName: businessName.trim(),
        isEmailVerified: true,
        isAdmin: false,
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: contactPerson.trim(),
        password: hashedPassword,
        phone: phone.trim(),
        role: 'PRODUCER_MANAGER',
        businessName: businessName.trim(),
        isEmailVerified: true,
      },
    });
  }

  const roleStr = user.role.toLowerCase();
  const token = generateAccessToken(user.id, roleStr);
  const refreshToken = generateRefreshToken(user.id);

  return {
    vendor: {
      _id: vendor.id,
      id: vendor.id,
      userId: user.id,
      name: user.name,
      email: vendor.email,
      businessName: vendor.businessName,
      businessType: vendor.businessType.toLowerCase(),
      contactPerson: vendor.contactPerson,
      status: vendor.status.toLowerCase(),
      role: roleStr,
      token,
      accessToken: token,
    },
    refreshToken,
  };
};

/**
 * Vendor Login verifying authoritative User password + Vendor association.
 */
const loginVendor = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Authoritative credential check on User
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid email or password');
  }

  // Associated Vendor check
  const vendor = await prisma.vendor.findUnique({
    where: { email: normalizedEmail },
  });

  if (!vendor) {
    throw new Error('No vendor account associated with this email');
  }

  if (!vendor.isActive) {
    throw new Error('Vendor account is deactivated');
  }

  if (vendor.status === 'SUSPENDED' || vendor.status === 'REJECTED') {
    throw new Error(`Vendor account is ${vendor.status.toLowerCase()}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  }).catch(() => {});

  const roleStr = user.role ? user.role.toLowerCase() : 'producer_manager';
  const token = generateAccessToken(user.id, roleStr);
  const refreshToken = generateRefreshToken(user.id);

  return {
    vendor: {
      _id: vendor.id,
      id: vendor.id,
      userId: user.id,
      name: user.name || vendor.contactPerson,
      email: vendor.email,
      businessName: vendor.businessName,
      businessType: vendor.businessType.toLowerCase(),
      contactPerson: vendor.contactPerson,
      logo: vendor.logo,
      status: vendor.status.toLowerCase(),
      role: roleStr,
      metrics: vendor.metrics || {},
      token,
      accessToken: token,
    },
    refreshToken,
  };
};

module.exports = {
  registerVendor,
  loginVendor,
};
