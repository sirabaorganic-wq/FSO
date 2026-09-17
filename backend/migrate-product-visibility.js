/**
 * Migration Script: Add isPublic field to existing products
 *
 * This script updates all existing products to set the isPublic field
 * based on their isVendorProduct, vendorStatus, and isActive values.
 *
 * Run this ONCE after deploying the new Product model.
 */

const mongoose = require("mongoose");
require("dotenv").config();

const migrateProducts = async () => {
  try {
    console.log("🔄 Starting product visibility migration...\n");

    // Connect to database
    const conn = await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/siraba_organic",
    );
    console.log(`✓ Connected to MongoDB: ${conn.connection.host}\n`);

    const Product = require("./models/Product");

    // 1. Update admin products (isVendorProduct = false or not set)
    console.log("1️⃣  Updating admin products...");
    const adminResult = await Product.updateMany(
      {
        $or: [
          { isVendorProduct: false },
          { isVendorProduct: { $exists: false } },
        ],
      },
      { $set: { isPublic: true } },
    );
    console.log(
      `   ✓ ${adminResult.modifiedCount} admin products set to public\n`,
    );

    // 2. Update approved & active vendor products
    console.log("2️⃣  Updating approved vendor products...");
    const approvedResult = await Product.updateMany(
      {
        isVendorProduct: true,
        vendorStatus: "approved",
        isActive: true,
      },
      { $set: { isPublic: true } },
    );
    console.log(
      `   ✓ ${approvedResult.modifiedCount} vendor products set to public\n`,
    );

    // 3. Update pending/rejected/inactive vendor products
    console.log("3️⃣  Updating non-public vendor products...");
    const hiddenResult = await Product.updateMany(
      {
        isVendorProduct: true,
        $or: [
          { vendorStatus: { $ne: "approved" } },
          { isActive: { $ne: true } },
        ],
      },
      { $set: { isPublic: false } },
    );
    console.log(
      `   ✓ ${hiddenResult.modifiedCount} vendor products set to private\n`,
    );

    // 4. Verify migration
    console.log("4️⃣  Verifying migration...");
    const totalProducts = await Product.countDocuments({});
    const publicProducts = await Product.countDocuments({ isPublic: true });
    const privateProducts = await Product.countDocuments({ isPublic: false });
    const nullProducts = await Product.countDocuments({ isPublic: null });

    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Public products: ${publicProducts}`);
    console.log(`   Private products: ${privateProducts}`);
    console.log(`   Without isPublic field: ${nullProducts}\n`);

    if (nullProducts > 0) {
      console.log("   ⚠️  Warning: Some products still missing isPublic field");
      console.log("   Re-run migration or check product data\n");
    } else {
      console.log("   ✅ All products have isPublic field\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Migration completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 5. Test query performance
    console.log("5️⃣  Testing query performance...\n");

    const testCategory = "tea"; // Change to a category that exists in your DB

    // Old slow query (for comparison)
    console.log("   OLD QUERY (with $or and $ne):");
    const startOld = Date.now();
    const oldExplain = await Product.find({
      $or: [
        { isVendorProduct: { $ne: true } },
        { isVendorProduct: true, vendorStatus: "approved", isActive: true },
      ],
      category: testCategory,
    }).explain("executionStats");
    const oldTime = Date.now() - startOld;

    console.log(
      `   - Stage: ${oldExplain.executionStats.executionStages.stage}`,
    );
    console.log(`   - Time: ${oldTime}ms`);
    console.log(
      `   - Docs Examined: ${oldExplain.executionStats.totalDocsExamined}`,
    );
    console.log(`   - Docs Returned: ${oldExplain.executionStats.nReturned}\n`);

    // New fast query
    console.log("   NEW QUERY (with isPublic):");
    const startNew = Date.now();
    const newExplain = await Product.find({
      isPublic: true,
      category: testCategory,
    }).explain("executionStats");
    const newTime = Date.now() - startNew;

    console.log(
      `   - Stage: ${newExplain.executionStats.executionStages.stage}`,
    );
    console.log(`   - Time: ${newTime}ms`);
    console.log(
      `   - Docs Examined: ${newExplain.executionStats.totalDocsExamined}`,
    );
    console.log(`   - Docs Returned: ${newExplain.executionStats.nReturned}\n`);

    if (newTime < oldTime) {
      const improvement = (((oldTime - newTime) / oldTime) * 100).toFixed(1);
      console.log(`   🎉 New query is ${improvement}% faster!\n`);
    }

    if (newExplain.executionStats.executionStages.stage === "IXSCAN") {
      console.log("   ✅ Using index scan (IXSCAN) - Optimal!\n");
    } else {
      console.log("   ⚠️  Still using collection scan (COLLSCAN)");
      console.log("   Run: await Product.syncIndexes() to rebuild indexes\n");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("✓ Database connection closed");
    process.exit(0);
  }
};

// Run migration
migrateProducts();
