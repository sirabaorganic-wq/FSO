const cloudinary = require("cloudinary").v2;

const requiredKeys = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missing = requiredKeys.filter((key) => !process.env[key]);

if (missing.length) {
  console.warn(`[cloudinary] Missing env vars: ${missing.join(", ")}`);
} else {
  console.log("[cloudinary] All env vars present, configuring...");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log(
  `[cloudinary] Configured with cloud_name: ${cloudinary.config().cloud_name || "NOT SET"}`,
);

module.exports = cloudinary;
