const crypto = require("crypto");

// Generate a 6-digit numeric OTP using cryptographically strong randomness
const generateOTP = () => {
  // crypto.randomInt is inclusive of min and exclusive of max
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
};

module.exports = {
  generateOTP,
};

