/**
 * FSO Email Service
 * All brand references are driven by marketplace.config and environment variables.
 * No hardcoded "Siraba Organic" branding.
 */

const nodemailer = require("nodemailer");
const { marketplaceConfig } = require("../config/marketplace.config");

const BRAND = marketplaceConfig.brand;
const EMAIL_BRAND = marketplaceConfig.email;

// Create a reusable Nodemailer transporter based on environment configuration
const createTransporter = () => {
  if (process.env.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback to Gmail-style configuration for development
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Check if email is properly configured
const isEmailConfigured = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  if (process.env.EMAIL_USER === "your_email@gmail.com") return false;
  return true;
};

// ─── Email Header Component ───────────────────────────────────────────────────
const buildEmailHeader = (title, subtitle) => `
  <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: ${EMAIL_BRAND.headerGradient};">
    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: ${EMAIL_BRAND.headerTextColor};">
      ${title || BRAND.name}
    </h1>
    ${subtitle ? `<p style="margin: 4px 0 0; font-size: 13px; color: #e5e7eb;">${subtitle}</p>` : ""}
  </div>
`;

// ─── Email Footer Component ───────────────────────────────────────────────────
const buildEmailFooter = () => `
  <div style="padding: 12px 24px 18px; border-top: 1px solid #f1f5f9; background-color: #f9fafb;">
    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
      &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
    </p>
    <p style="margin: 4px 0 0; font-size: 11px; color: #9ca3af;">
      ${BRAND.tagline}
    </p>
  </div>
`;

// ─── OTP Email ────────────────────────────────────────────────────────────────
const buildOtpEmailHtml = (otp, contextLabel) => {
  const safeContext = contextLabel || "verification";

  return `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f7; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);">
        ${buildEmailHeader(BRAND.name, `One-time password for ${safeContext}`)}
        <div style="padding: 24px 24px 8px;">
          <p style="font-size: 14px; color: #0f172a; margin: 0 0 12px;">Hi there,</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 16px; line-height: 1.6;">
            Use the one-time password below to complete your ${safeContext} on
            <strong>${BRAND.name}</strong>. This code is valid for
            <strong>10 minutes</strong>.
          </p>
          <div style="margin: 16px 0 20px; text-align: center;">
            <div style="display: inline-block; letter-spacing: 8px; font-size: 24px; font-weight: 700; padding: 12px 20px; border-radius: 999px; background-color: ${EMAIL_BRAND.accentBgColor}; color: ${EMAIL_BRAND.accentColor}; font-family: 'SF Mono', ui-monospace, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px; line-height: 1.6;">
            For your security, never share this code with anyone. ${BRAND.name} staff will
            <strong>never</strong> ask you for your OTP.
          </p>
          <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px;">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
        ${buildEmailFooter()}
      </div>
    </div>
  `;
};

// ─── Send OTP Email ───────────────────────────────────────────────────────────
const sendOTPEmail = async (to, otp, contextLabel) => {
  const normalizedEmail = (to || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw new Error("Recipient email is required for OTP email");
  }

  if (!isEmailConfigured()) {
    // In development, log OTP without exposing in production
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[DEV] OTP for ${normalizedEmail}: ${otp} (context: ${contextLabel})`
      );
    }
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: EMAIL_BRAND.fromAddress,
    to: normalizedEmail,
    subject: `Your ${BRAND.name} verification code`,
    html: buildOtpEmailHtml(otp, contextLabel),
  });
};

// ─── Vendor/Producer Welcome Email ───────────────────────────────────────────
const sendVendorWelcomeEmail = async (vendorEmail, vendorName) => {
  const normalizedEmail = (vendorEmail || "").toLowerCase().trim();
  if (!normalizedEmail) return;

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Welcome email not sent. Email: ${normalizedEmail}, Name: ${vendorName}`);
    }
    return;
  }

  const transporter = createTransporter();
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f5f5f7; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);">
        ${buildEmailHeader(`Welcome to ${BRAND.name}!`)}
        <div style="padding: 24px 24px 8px;">
          <p style="font-size: 14px; color: #0f172a; margin: 0 0 12px;">Hi ${vendorName},</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 16px; line-height: 1.6;">
            We are thrilled to welcome you to the ${BRAND.name} producer community! Your registration was successful.
            Please log in to your dashboard to complete your onboarding and upload the required documents.
          </p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 16px; line-height: 1.6;">
            If you have any questions, reach out to us at <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a>.
          </p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 16px; line-height: 1.6;">
            Warm regards,<br/>The ${BRAND.name} Team
          </p>
        </div>
        ${buildEmailFooter()}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: EMAIL_BRAND.fromAddress,
    to: normalizedEmail,
    subject: `Welcome to ${BRAND.name}!`,
    html,
  });
};

// ─── Admin New Vendor Notification ───────────────────────────────────────────
const sendAdminNewVendorEmail = async (vendorDetails) => {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Admin notification not sent. Vendor: ${vendorDetails.businessName}`);
    }
    return;
  }

  const adminEmail = EMAIL_BRAND.adminNotificationEmail;
  if (!adminEmail) {
    console.warn("[EMAIL] FSO_ADMIN_EMAIL not set — admin vendor notification skipped");
    return;
  }

  const transporter = createTransporter();
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; background-color: #f5f5f7; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);">
        ${buildEmailHeader("New Producer Registration")}
        <div style="padding: 24px 24px 8px;">
          <p style="font-size: 14px; color: #0f172a; margin: 0 0 12px;">A new producer has registered on ${BRAND.name}.</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 8px;"><strong>Business Name:</strong> ${vendorDetails.businessName}</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 8px;"><strong>Contact Person:</strong> ${vendorDetails.contactPerson}</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 8px;"><strong>Email:</strong> ${vendorDetails.email}</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 8px;"><strong>Phone:</strong> ${vendorDetails.phone}</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 8px;"><strong>Business Type:</strong> ${vendorDetails.businessType}</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 16px;"><strong>City/State:</strong> ${vendorDetails.address?.city}, ${vendorDetails.address?.state}</p>
          <p style="font-size: 14px; color: #1f2937; margin: 0 0 16px; line-height: 1.6;">
            Please review their details in the admin dashboard.
          </p>
        </div>
        ${buildEmailFooter()}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: EMAIL_BRAND.fromAddress,
    to: adminEmail,
    subject: `New Producer Registration — ${BRAND.name}`,
    html,
  });
};

module.exports = {
  sendOTPEmail,
  buildOtpEmailHtml,
  isEmailConfigured,
  sendVendorWelcomeEmail,
  sendAdminNewVendorEmail,
};
