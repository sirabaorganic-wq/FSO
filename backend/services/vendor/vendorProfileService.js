/**
 * FSO Vendor Profile Service — Neon PostgreSQL via Prisma
 * Strictly derives vendor ownership from authenticated req.vendor.id.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { sendOTPEmail } = require('../../utils/emailService');
const { generateOTP } = require('../../utils/otpUtils');

/**
 * Get vendor profile details.
 */
const getVendorProfile = async (vendorId) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: {
      adminNotes: {
        select: { id: true, note: true, createdAt: true },
      },
    },
  });

  if (!vendor) return null;

  return {
    ...vendor,
    _id: vendor.id,
    status: (vendor.status || '').toLowerCase(),
    businessType: (vendor.businessType || '').toLowerCase(),
  };
};

/**
 * Update general vendor profile information.
 */
const updateVendorProfile = async (vendorId, data) => {
  const allowedUpdates = {};
  if (data.businessName) allowedUpdates.businessName = data.businessName.trim();
  if (data.contactPerson) allowedUpdates.contactPerson = data.contactPerson.trim();
  if (data.phone) allowedUpdates.phone = data.phone.trim();
  if (data.alternatePhone !== undefined) allowedUpdates.alternatePhone = data.alternatePhone;
  if (data.businessDescription !== undefined) allowedUpdates.businessDescription = data.businessDescription;
  if (data.logo !== undefined) allowedUpdates.logo = data.logo;
  if (data.website !== undefined) allowedUpdates.website = data.website;
  if (data.addressStreet !== undefined) allowedUpdates.addressStreet = data.addressStreet;
  if (data.addressCity) allowedUpdates.addressCity = data.addressCity.trim();
  if (data.addressState) allowedUpdates.addressState = data.addressState.trim();
  if (data.addressPostalCode) allowedUpdates.addressPostalCode = data.addressPostalCode.trim();
  if (data.village !== undefined) allowedUpdates.village = data.village;
  if (data.district !== undefined) allowedUpdates.district = data.district;
  if (data.region !== undefined) allowedUpdates.region = data.region;

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: allowedUpdates,
  });

  return {
    ...updated,
    _id: updated.id,
    status: (updated.status || '').toLowerCase(),
    businessType: (updated.businessType || '').toLowerCase(),
  };
};

/**
 * Request sensitive update OTP.
 */
const requestSensitiveOtp = async (vendorId, context = 'sensitive update') => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  const plainOtp = generateOTP();
  const normalizedIdentifier = vendor.email.toLowerCase().trim();
  const hashedOtp = await bcrypt.hash(plainOtp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  await prisma.oTP.deleteMany({ where: { identifier: normalizedIdentifier, type: 'email' } });
  await prisma.oTP.create({
    data: {
      identifier: normalizedIdentifier,
      otp: hashedOtp,
      type: 'email',
      attempts: 0,
      expiresAt,
    },
  });

  await sendOTPEmail(vendor.email, plainOtp, context);

  return {
    message: `Verification OTP has been sent to your registered email address (${vendor.email}).`,
    email: vendor.email,
  };
};

/**
 * Update vendor bank details with OTP check.
 */
const updateBankDetailsWithOtp = async (vendorId, bankDetails, otp) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  if (!otp) {
    throw new Error('Email verification OTP is required to update bank details.');
  }

  const normalized = vendor.email.toLowerCase().trim();
  const otpDoc = await prisma.oTP.findFirst({
    where: { identifier: normalized, type: 'email' },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    if (otpDoc) await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});
    throw new Error('OTP is invalid or has expired');
  }

  const isMatch = await bcrypt.compare(String(otp).trim(), otpDoc.otp);
  if (!isMatch) {
    await prisma.oTP.update({
      where: { id: otpDoc.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error('Invalid OTP');
  }

  await prisma.oTP.delete({ where: { id: otpDoc.id } }).catch(() => {});

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { bankDetails },
  });

  return {
    bankDetails: updated.bankDetails,
    message: 'Bank details updated successfully',
  };
};

/**
 * Update vendor bank details directly.
 */
const updateBankDetails = async (vendorId, bankDetails) => {
  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { bankDetails },
  });

  return {
    bankDetails: updated.bankDetails,
    message: 'Bank details updated successfully',
  };
};

/**
 * Update vendor pickup address for Shiprocket logistics.
 */
const updatePickupAddress = async (vendorId, pickupAddress) => {
  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      pickupAddress,
      shiprocketPickupCode: pickupAddress?.pickupLocation || null,
      shiprocketLocationName: pickupAddress?.pickupLocation || null,
    },
  });

  return {
    pickupAddress: updated.pickupAddress,
    shiprocketPickupCode: updated.shiprocketPickupCode,
    message: 'Pickup address updated successfully',
  };
};

/**
 * Update vendor onboarding step data.
 */
const updateOnboarding = async (vendorId, stepData) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return null;

  const updateData = {};
  if (stepData.panNumber) updateData.panNumber = stepData.panNumber.trim().toUpperCase();
  if (stepData.gstNumber) updateData.gstNumber = stepData.gstNumber.trim().toUpperCase();
  if (stepData.fssaiNumber) updateData.fssaiNumber = stepData.fssaiNumber.trim();
  if (stepData.bankDetails) updateData.bankDetails = stepData.bankDetails;
  if (stepData.pickupAddress) updateData.pickupAddress = stepData.pickupAddress;

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: updateData,
  });

  return {
    ...updated,
    _id: updated.id,
  };
};

const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_DOC_TYPES = ['fssai', 'gst', 'organic', 'pan', 'trade_license', 'certificate'];

/**
 * Add a compliance document.
 * Enforces file security boundaries:
 * - Allowed types: fssai, gst, organic, pan, trade_license, certificate
 * - Valid https:// URL
 * - Allowed extensions: .pdf, .jpg, .jpeg, .png, .webp
 * - Rejects dangerous URI schemes (javascript:, data:, file:)
 */
const addComplianceDoc = async (vendorId, docData) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  const rawType = (docData.type || '').toLowerCase().trim();
  if (!ALLOWED_DOC_TYPES.includes(rawType)) {
    const err = new Error(`Invalid document type. Allowed: ${ALLOWED_DOC_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const fileUrl = (docData.fileUrl || '').trim();
  if (!fileUrl.startsWith('https://')) {
    const err = new Error('File URL must use secure HTTPS protocol');
    err.statusCode = 400;
    throw err;
  }

  const lowerUrl = fileUrl.toLowerCase();
  const hasValidExt = ALLOWED_DOC_EXTENSIONS.some((ext) => lowerUrl.includes(ext));
  if (!hasValidExt) {
    const err = new Error(`File URL must point to a supported format (${ALLOWED_DOC_EXTENSIONS.join(', ')})`);
    err.statusCode = 400;
    throw err;
  }

  const existingCert = typeof vendor.organicCertification === 'object' && vendor.organicCertification !== null
    ? vendor.organicCertification
    : {};
  const documents = Array.isArray(existingCert.documents) ? existingCert.documents : [];

  const newDoc = {
    id: crypto.randomBytes(12).toString('hex'),
    _id: crypto.randomBytes(12).toString('hex'),
    name: (docData.name || 'Compliance Document').trim(),
    type: rawType,
    fileUrl,
    expiryDate: docData.expiryDate || null,
    status: 'pending',
    uploadedAt: new Date().toISOString(),
  };

  documents.push(newDoc);
  existingCert.documents = documents;

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { organicCertification: existingCert },
  });

  return documents;
};

/**
 * Get compliance documents for vendor.
 */
const getComplianceDocs = async (vendorId) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { organicCertification: true },
  });

  if (!vendor) return [];
  const cert = typeof vendor.organicCertification === 'object' && vendor.organicCertification !== null
    ? vendor.organicCertification
    : {};
  return Array.isArray(cert.documents) ? cert.documents : [];
};

/**
 * Delete a compliance document.
 */
const deleteComplianceDoc = async (vendorId, docId) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  const cert = typeof vendor.organicCertification === 'object' && vendor.organicCertification !== null
    ? vendor.organicCertification
    : {};
  const documents = Array.isArray(cert.documents) ? cert.documents : [];

  const filtered = documents.filter((d) => d.id !== docId && d._id !== docId);
  cert.documents = filtered;

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { organicCertification: cert },
  });

  return { message: 'Document removed' };
};

/**
 * Get vendor shop settings.
 */
const getShopSettings = async (vendorId) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, businessName: true, slug: true, shopSettings: true },
  });

  if (!vendor) return null;
  return vendor.shopSettings || { shopSlug: vendor.slug, isPublished: true };
};

/**
 * Update vendor shop settings.
 */
const updateShopSettings = async (vendorId, settings) => {
  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: { shopSettings: settings },
  });

  return updated.shopSettings;
};

/**
 * Get public shop data by slug or ID.
 */
const getPublicShop = async (slugOrId) => {
  // Check if CUID or ID or slug
  let vendor = await prisma.vendor.findFirst({
    where: {
      OR: [
        { id: slugOrId },
        { slug: slugOrId },
      ],
    },
    include: {
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          image: true,
          images: true,
          category: true,
          rating: true,
          numReviews: true,
          vendorStatus: true,
        },
      },
    },
  });

  if (!vendor) return null;

  const shopSettings = typeof vendor.shopSettings === 'object' && vendor.shopSettings !== null
    ? vendor.shopSettings
    : {};
  const metrics = typeof vendor.metrics === 'object' && vendor.metrics !== null
    ? vendor.metrics
    : {};

  return {
    shop: {
      id: vendor.id,
      _id: vendor.id,
      name: shopSettings.shopName || vendor.businessName,
      slug: shopSettings.shopSlug || vendor.slug,
      tagline: shopSettings.tagline,
      description: shopSettings.shopDescription,
      banner: shopSettings.shopBanner,
      logo: shopSettings.shopLogo || vendor.logo,
      returnPolicy: shopSettings.returnPolicy,
      shippingPolicy: shopSettings.shippingPolicy,
      processingTime: shopSettings.processingTime,
      socialLinks: shopSettings.socialLinks,
      rating: metrics.averageRating || 0,
      totalReviews: metrics.totalReviews || 0,
      totalOrders: metrics.completedOrders || 0,
      isPublished: shopSettings.isPublished !== false,
    },
    products: vendor.products.map((p) => ({
      ...p,
      _id: p.id,
    })),
  };
};

/**
 * Get distinct customer summary for this vendor from real VendorOrder records.
 * Minimizes PII (only name, email, order counts, spend, and last order date).
 */
const getVendorCustomers = async (vendorId) => {
  const vendorOrders = await prisma.vendorOrder.findMany({
    where: {
      vendorId,
      status: { not: 'CANCELLED' },
    },
    include: {
      order: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const customerMap = {};

  for (const vo of vendorOrders) {
    const user = vo.order?.user;
    if (!user) continue;

    const customerId = user.id;
    if (!customerMap[customerId]) {
      customerMap[customerId] = {
        id: user.id,
        _id: user.id,
        name: user.name || 'Customer',
        email: user.email || '',
        ordersCount: 0,
        totalSpend: 0,
        lastOrderDate: vo.createdAt,
      };
    }

    customerMap[customerId].ordersCount += 1;
    customerMap[customerId].totalSpend += vo.subtotal || 0;
    if (vo.createdAt > customerMap[customerId].lastOrderDate) {
      customerMap[customerId].lastOrderDate = vo.createdAt;
    }
  }

  const customers = Object.values(customerMap).map((c) => ({
    ...c,
    totalSpend: Math.round(c.totalSpend * 100) / 100,
  }));

  return {
    customers,
    total: customers.length,
  };
};

module.exports = {
  getVendorProfile,
  updateVendorProfile,
  requestSensitiveOtp,
  updateBankDetailsWithOtp,
  updateBankDetails,
  updatePickupAddress,
  updateOnboarding,
  addComplianceDoc,
  getComplianceDocs,
  deleteComplianceDoc,
  getShopSettings,
  updateShopSettings,
  getPublicShop,
  getVendorCustomers,
};
