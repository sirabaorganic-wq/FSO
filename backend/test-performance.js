// Performance Test Script
// Run this to verify cache and index performance

const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");
const {
  productCache,
  invalidateCache,
  getCacheStats,
} = require("./config/cache");

const testPerformance = async () => {
  try {
    console.log("🧪 Testing Performance Optimizations\n");

    // Connect to database
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/siraba_organic",
    );
    console.log("✓ Connected to MongoDB\n");

    // Test 1: Index Usage
    console.log("1️⃣  Testing Database Indexes...");

    const startIndexTest = Date.now();
    const products = await Product.find({
      category: "tea",
      isActive: true,
    })
      .limit(10)
      .explain("executionStats");
    const indexTime = Date.now() - startIndexTest;

    const usedIndex =
      products.executionStats.executionStages.stage === "IXSCAN";
    console.log(`   Query Time: ${indexTime}ms`);
    console.log(
      `   Index Used: ${usedIndex ? "✓ YES (IXSCAN)" : "✗ NO (COLLSCAN)"}`,
    );
    console.log(
      `   Docs Examined: ${products.executionStats.totalDocsExamined}`,
    );
    console.log(`   Docs Returned: ${products.executionStats.nReturned}\n`);

    // Test 2: Cache Performance
    console.log("2️⃣  Testing Cache System...");

    // Clear cache first
    invalidateCache.products();
    console.log("   Cache cleared\n");

    // First query (cache miss)
    const startQuery1 = Date.now();
    const testProducts = await Product.find({ category: "tea" }).limit(5);
    const query1Time = Date.now() - startQuery1;
    console.log(`   First Query (DB): ${query1Time}ms`);

    // Cache the result manually (simulating middleware)
    const cacheKey = "products:list:category=tea";
    productCache.set(cacheKey, testProducts);

    // Second query (cache hit)
    const startQuery2 = Date.now();
    const cachedProducts = productCache.get(cacheKey);
    const query2Time = Date.now() - startQuery2;
    console.log(`   Second Query (Cache): ${query2Time}ms`);

    if (cachedProducts) {
      const improvement = (
        ((query1Time - query2Time) / query1Time) *
        100
      ).toFixed(1);
      console.log(`   Cache Hit: ✓ YES`);
      console.log(`   Speed Improvement: ${improvement}%\n`);
    } else {
      console.log(`   Cache Hit: ✗ NO\n`);
    }

    // Test 3: Cache Statistics
    console.log("3️⃣  Cache Statistics...");
    const stats = getCacheStats();
    console.log(`   Product Cache Keys: ${stats.products.keys}`);
    console.log(`   Product Cache Hits: ${stats.products.hits}`);
    console.log(`   Product Cache Misses: ${stats.products.misses}`);

    if (stats.products.hits + stats.products.misses > 0) {
      const hitRatio = (
        (stats.products.hits / (stats.products.hits + stats.products.misses)) *
        100
      ).toFixed(1);
      console.log(`   Hit Ratio: ${hitRatio}%\n`);
    } else {
      console.log(`   Hit Ratio: N/A (no requests yet)\n`);
    }

    // Test 4: Index Information
    console.log("4️⃣  Database Index Information...");
    const indexes = await Product.collection.getIndexes();
    console.log(`   Total Indexes: ${Object.keys(indexes).length}`);
    Object.keys(indexes).forEach((name) => {
      console.log(`   - ${name}`);
    });
    console.log("");

    // Summary
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Performance Optimization Test Complete");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n🎯 Results:`);
    console.log(`   - Indexes: ${usedIndex ? "Working ✓" : "Not Used ✗"}`);
    console.log(
      `   - Cache: ${cachedProducts ? "Working ✓" : "Not Working ✗"}`,
    );
    console.log(
      `   - Query Speed: ${indexTime < 50 ? "Excellent ✓" : indexTime < 100 ? "Good" : "Needs Improvement"}`,
    );

    if (cachedProducts && query2Time < 5) {
      console.log(`   - Cache Speed: Excellent ✓`);
    }

    console.log("");
  } catch (error) {
    console.error("❌ Test Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("✓ Database connection closed");
  }
};

// Run tests
testPerformance();
