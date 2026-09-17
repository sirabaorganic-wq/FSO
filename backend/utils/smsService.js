const twilio = require("twilio");

// Create Twilio client only if credentials are present
const hasTwilioConfig = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER,
  );

let twilioClient = null;

const getTwilioClient = () => {
  if (!hasTwilioConfig()) {
    return null;
  }
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return twilioClient;
};

// Send OTP via SMS using Twilio
const sendOTPSMS = async (phone, otp, contextLabel) => {
  const normalizedPhone = (phone || "").trim();

  if (!normalizedPhone) {
    throw new Error("Recipient phone number is required for OTP SMS");
  }

  const client = getTwilioClient();

  // In development, if Twilio is not configured, log OTP instead of failing hard
  if (!client) {
    console.log(
      `[DEV ONLY] OTP SMS not sent (Twilio not configured). Phone: ${normalizedPhone}, OTP: ${otp}`,
    );
    return;
  }

  const brandName = process.env.FSO_BRAND_NAME || "Flash Sales Online";
  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: normalizedPhone,
    body: `Your ${brandName} verification code is ${otp}. It will expire in 10 minutes.${contextLabel ? ` Purpose: ${contextLabel}.` : ""
      }`,
  });
};

module.exports = {
  sendOTPSMS,
  hasTwilioConfig,
};

