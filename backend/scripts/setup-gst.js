/**
 * Script to setup GST Settings with default vendor GSTIN
 * Run this once to initialize GST settings in the database
 */

const mongoose = require("mongoose");
require("dotenv").config();

const GSTSettings = require("../models/GSTSettings");

// Default Vendor GSTIN (Replace with actual GSTIN for Siraba Organic)
const DEFAULT_VENDOR_GSTIN = "05ABCDE1234F1Z5"; // Kashmir state code is 01, but use actual GSTIN

const setupGST = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get or create GST settings
    let gstSettings = await GSTSettings.findOne();

    if (!gstSettings) {
      // Create new settings
      gstSettings = await GSTSettings.create({
        gst_enabled: true,
        default_gst_percentage: 18,
        admin_gst_number: DEFAULT_VENDOR_GSTIN,
      });
      console.log("✅ Created new GST settings");
    } else {
      // Update existing settings if admin_gst_number is empty
      if (!gstSettings.admin_gst_number) {
        gstSettings.admin_gst_number = DEFAULT_VENDOR_GSTIN;
        gstSettings.gst_enabled = true;
        await gstSettings.save();
        console.log("✅ Updated GST settings with vendor GSTIN");
      } else {
        console.log("✅ GST settings already configured");
      }
    }

    console.log("\n📋 Current GST Settings:");
    console.log("   GST Enabled:", gstSettings.gst_enabled);
    console.log("   Default GST %:", gstSettings.default_gst_percentage);
    console.log("   Vendor GSTIN:", gstSettings.admin_gst_number);

    console.log(
      "\n⚠️  IMPORTANT: Please update the vendor GSTIN in the admin panel or database",
    );
    console.log("   Current placeholder:", DEFAULT_VENDOR_GSTIN);
    console.log("   Update with actual Siraba Organic GSTIN\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
};

// Run the script
setupGST();
