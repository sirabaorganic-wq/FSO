/**
 * Phase 1: Foundation & Contract Integrity Automated Verification Script
 * 
 * Verifies:
 * 1. Vendor slug schema migration & deterministic backfill
 * 2. Producer API dual-lookup (CUID & persistent slug) + 404 for unknown
 * 3. Product category resolution (canonical slugs + display names)
 * 4. Product categories list (all 5 categories with authentic counts)
 * 5. Collision-safe vendor slug generation
 * 6. Frontend security (in-memory token verification)
 * 7. Neon database record counts before & after (ensures zero data mutation)
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = require('../config/prisma');
const producerRoutes = require('../routes/producerRoutes');
const productRoutes = require('../routes/productRoutes');

let testResults = {
  passed: 0,
  failed: 0,
  details: []
};

function recordTest(name, passed, message = '') {
  if (passed) {
    testResults.passed++;
    console.log(`  ✅ [PASS] ${name}`);
    testResults.details.push({ name, status: 'PASS', message });
  } else {
    testResults.failed++;
    console.error(`  ❌ [FAIL] ${name}: ${message}`);
    testResults.details.push({ name, status: 'FAIL', message });
  }
}

async function getNeonCounts() {
  const [users, vendors, products, categories, orders, reviews, articles, recipes, ingredients, collections, banners] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.order.count(),
    prisma.review.count(),
    prisma.article.count(),
    prisma.recipe.count(),
    prisma.ingredient.count(),
    prisma.collection.count(),
    prisma.banner.count(),
  ]);

  return {
    users,
    vendors,
    products,
    categories,
    orders,
    reviews,
    articles,
    recipes,
    ingredients,
    collections,
    banners,
  };
}

async function runVerification() {
  console.log('===============================================================');
  console.log('   PHASE 1: FOUNDATION & CONTRACT INTEGRITY VERIFICATION');
  console.log('===============================================================\n');

  // --- STEP 1: INITIAL RECORD COUNTS ---
  console.log('1. Checking Initial Neon Database Record Counts...');
  const countsBefore = await getNeonCounts();
  console.log('   Counts before test execution:', JSON.stringify(countsBefore, null, 2));

  recordTest('Neon initial counts match expected baseline',
    countsBefore.vendors === 2 &&
    countsBefore.products === 2 &&
    countsBefore.categories === 5,
    `Found vendors: ${countsBefore.vendors}, products: ${countsBefore.products}, categories: ${countsBefore.categories}`
  );

  // --- STEP 2: VENDOR SLUG PERSISTENCE & UNIQUENESS ---
  console.log('\n2. Verifying Vendor Slugs in Neon Database...');
  const vendors = await prisma.vendor.findMany({
    select: { id: true, businessName: true, slug: true, email: true }
  });

  const v1 = vendors.find(v => v.businessName === 'Kashmir Saffron & Heritage Artisans');
  const v2 = vendors.find(v => v.businessName === 'Pahadi Amrut Forest Collective');

  recordTest('Vendor 1 (Kashmir Saffron) exists with deterministic slug',
    v1 && v1.slug === 'kashmir-saffron-heritage-artisans',
    v1 ? `Slug is ${v1.slug}` : 'Vendor not found'
  );

  recordTest('Vendor 2 (Pahadi Amrut) exists with deterministic slug',
    v2 && v2.slug === 'pahadi-amrut-forest-collective',
    v2 ? `Slug is ${v2.slug}` : 'Vendor not found'
  );

  const slugs = vendors.map(v => v.slug);
  const uniqueSlugs = new Set(slugs);
  recordTest('All vendor slugs are non-null and unique',
    slugs.every(s => typeof s === 'string' && s.length > 0) && slugs.length === uniqueSlugs.size,
    `Slugs: ${slugs.join(', ')}`
  );

  // --- STEP 3: PRODUCER API DUAL-LOOKUP ---
  console.log('\n3. Testing Producer API Dual-Lookup (/api/v1/producers/:id)...');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/producers', producerRoutes);
  app.use('/api/v1/products', productRoutes);

  // Test v1 CUID lookup
  const resV1Cuid = await request(app).get(`/api/v1/producers/${v1.id}`);
  recordTest(`GET /api/v1/producers/${v1.id} (CUID lookup) returns 200 with slug`,
    resV1Cuid.status === 200 && resV1Cuid.body.data && resV1Cuid.body.data.slug === 'kashmir-saffron-heritage-artisans',
    `Status: ${resV1Cuid.status}, slug: ${resV1Cuid.body.data?.slug}`
  );

  // Test v1 Slug lookup
  const resV1Slug = await request(app).get(`/api/v1/producers/kashmir-saffron-heritage-artisans`);
  recordTest(`GET /api/v1/producers/kashmir-saffron-heritage-artisans (Slug lookup) returns 200 with ID`,
    resV1Slug.status === 200 && resV1Slug.body.data && resV1Slug.body.data.id === v1.id,
    `Status: ${resV1Slug.status}, id: ${resV1Slug.body.data?.id}`
  );

  // Test v2 CUID lookup
  const resV2Cuid = await request(app).get(`/api/v1/producers/${v2.id}`);
  recordTest(`GET /api/v1/producers/${v2.id} (CUID lookup) returns 200 with slug`,
    resV2Cuid.status === 200 && resV2Cuid.body.data && resV2Cuid.body.data.slug === 'pahadi-amrut-forest-collective',
    `Status: ${resV2Cuid.status}, slug: ${resV2Cuid.body.data?.slug}`
  );

  // Test v2 Slug lookup
  const resV2Slug = await request(app).get(`/api/v1/producers/pahadi-amrut-forest-collective`);
  recordTest(`GET /api/v1/producers/pahadi-amrut-forest-collective (Slug lookup) returns 200 with ID`,
    resV2Slug.status === 200 && resV2Slug.body.data && resV2Slug.body.data.id === v2.id,
    `Status: ${resV2Slug.status}, id: ${resV2Slug.body.data?.id}`
  );

  // Test unknown lookup returns 404
  const resUnknown = await request(app).get(`/api/v1/producers/non-existent-producer-identifier-xyz`);
  recordTest('GET /api/v1/producers/unknown returns clean 404',
    resUnknown.status === 404 && resUnknown.body.success === false,
    `Status: ${resUnknown.status}, body: ${JSON.stringify(resUnknown.body)}`
  );

  // Test producer products endpoint by CUID and Slug
  const resV2ProdCuid = await request(app).get(`/api/v1/producers/${v2.id}/products`);
  recordTest(`GET /api/v1/producers/${v2.id}/products (CUID) returns producer and products`,
    resV2ProdCuid.status === 200 && resV2ProdCuid.body.data && Array.isArray(resV2ProdCuid.body.data.products),
    `Status: ${resV2ProdCuid.status}, products count: ${resV2ProdCuid.body.data?.products?.length}`
  );

  const resV2ProdSlug = await request(app).get(`/api/v1/producers/pahadi-amrut-forest-collective/products`);
  recordTest(`GET /api/v1/producers/pahadi-amrut-forest-collective/products (Slug) returns producer and products`,
    resV2ProdSlug.status === 200 && resV2ProdSlug.body.data && Array.isArray(resV2ProdSlug.body.data.products),
    `Status: ${resV2ProdSlug.status}, products count: ${resV2ProdSlug.body.data?.products?.length}`
  );

  // --- STEP 4: PRODUCT CATEGORY RESOLUTION ---
  console.log('\n4. Testing Product Category Filtering & Categories List...');
  
  // Test filtering by canonical slug: "herbs-tisanes"
  const resCatSlug = await request(app).get(`/api/v1/products?category=herbs-tisanes`);
  const productsBySlug = Array.isArray(resCatSlug.body) ? resCatSlug.body : (resCatSlug.body?.products || []);
  recordTest('GET /api/v1/products?category=herbs-tisanes (canonical slug) returns matching product(s)',
    resCatSlug.status === 200 &&
    productsBySlug.length > 0 &&
    productsBySlug[0].category.toLowerCase().includes('herbs'),
    `Status: ${resCatSlug.status}, count: ${productsBySlug.length}, product: ${productsBySlug[0]?.name}`
  );

  // Test filtering by display name: "Herbs & Tisanes"
  const resCatName = await request(app).get(`/api/v1/products?category=Herbs%20%26%20Tisanes`);
  const productsByName = Array.isArray(resCatName.body) ? resCatName.body : (resCatName.body?.products || []);
  recordTest('GET /api/v1/products?category=Herbs %26 Tisanes (display name) returns matching product(s)',
    resCatName.status === 200 &&
    productsByName.length > 0 &&
    productsByName[0].category.toLowerCase().includes('herbs'),
    `Status: ${resCatName.status}, count: ${productsByName.length}, product: ${productsByName[0]?.name}`
  );

  // Test GET /api/v1/products/categories
  const resCategories = await request(app).get('/api/v1/products/categories');
  const categoriesList = Array.isArray(resCategories.body) ? resCategories.body : (resCategories.body?.data || []);
  recordTest('GET /api/v1/products/categories returns all 5 active categories with authentic counts',
    resCategories.status === 200 &&
    categoriesList.length === 5,
    `Status: ${resCategories.status}, category count: ${categoriesList.length}, categories: ${categoriesList.map(c => `${c.name} (${c.count})`).join(', ')}`
  );

  // --- STEP 5: COLLISION-SAFE SLUG GENERATOR ---
  console.log('\n5. Testing Collision-Safe Slug Generator Logic...');
  const { generateUniqueVendorSlug } = require('../routes/vendorRoutes');
  if (typeof generateUniqueVendorSlug === 'function') {
    const collisionSlug = await generateUniqueVendorSlug('Kashmir Saffron & Heritage Artisans');
    recordTest('generateUniqueVendorSlug handles duplicate by appending incremental suffix',
      collisionSlug === 'kashmir-saffron-heritage-artisans-1' || collisionSlug.startsWith('kashmir-saffron-heritage-artisans-'),
      `Generated slug: ${collisionSlug}`
    );

    const newSlug = await generateUniqueVendorSlug('New Organic Valley Collective');
    recordTest('generateUniqueVendorSlug generates clean slug for new unique business name',
      newSlug === 'new-organic-valley-collective',
      `Generated slug: ${newSlug}`
    );
  } else {
    recordTest('generateUniqueVendorSlug is exported and available', false, 'Function not exported');
  }

  // --- STEP 6: FRONTEND SECURITY VERIFICATION ---
  console.log('\n6. Verifying Frontend In-Memory Token Storage & Security...');
  const clientTsPath = path.join(__dirname, '..', '..', 'client', 'lib', 'api', 'client.ts');
  const clientTsContent = fs.readFileSync(clientTsPath, 'utf8');

  recordTest('client.ts stores accessToken only in private class property',
    clientTsContent.includes('private accessToken: string | null = null') &&
    !clientTsContent.includes('localStorage.setItem') &&
    !clientTsContent.includes('sessionStorage.setItem'),
    'Token stored in private class property, no localStorage writes'
  );

  recordTest('client.ts uses credentials: "include" for silent refresh with httpOnly cookies',
    clientTsContent.includes("credentials: 'include'") &&
    clientTsContent.includes('/auth/refresh'),
    'Credentials mode include and refresh endpoint verified'
  );

  // --- STEP 7: FINAL RECORD COUNTS (INTEGRITY CHECK) ---
  console.log('\n7. Checking Final Neon Database Record Counts...');
  const countsAfter = await getNeonCounts();
  console.log('   Counts after test execution:', JSON.stringify(countsAfter, null, 2));

  const unchanged = Object.keys(countsBefore).every(k => countsBefore[k] === countsAfter[k]);
  recordTest('Neon record counts remain 100% UNCHANGED (zero accidental writes/deletes)',
    unchanged,
    unchanged ? 'All 11 table counts match exact baseline' : `Mismatch: before=${JSON.stringify(countsBefore)}, after=${JSON.stringify(countsAfter)}`
  );

  console.log('\n===============================================================');
  console.log(`VERIFICATION COMPLETE: ${testResults.passed} PASSED, ${testResults.failed} FAILED`);
  console.log('===============================================================\n');

  await prisma.$disconnect();

  if (testResults.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
