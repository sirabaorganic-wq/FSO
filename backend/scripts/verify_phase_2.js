/**
 * Phase 2: Customer Storefront & Live Data Wiring Automated Verification Script
 *
 * Verifies:
 * 1. Category endpoints and live product counts per category
 * 2. Category filtering with canonical slugs (herbs-tisanes, spices, oils-ghee)
 * 3. Collection detail endpoint returns canonical products array
 * 4. Collection listing returns active collections
 * 5. Producer listing and slug-based detail endpoints
 * 6. Producer products endpoint returns linked products
 * 7. Product detail endpoints with live inventory and vendor
 * 8. Cart add/sync resolution with slugs and CUIDs
 * 9. Database record counts invariant check (zero synthetic/fabricated data inserted)
 */

const express = require('express');
const request = require('supertest');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = require('../config/prisma');
const productRoutes = require('../routes/productRoutes');
const producerRoutes = require('../routes/producerRoutes');
const collectionRoutes = require('../routes/collectionRoutes');
const cartRoutes = require('../routes/cartRoutes');
const { protect } = require('../middleware/authMiddleware');

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
  const users = await prisma.user.count();
  const vendors = await prisma.vendor.count();
  const products = await prisma.product.count();
  const categories = await prisma.category.count();
  const orders = await prisma.order.count();
  const reviews = await prisma.review.count();
  const articles = await prisma.article.count();
  const recipes = await prisma.recipe.count();
  const ingredients = await prisma.ingredient.count();
  const collections = await prisma.collection.count();
  const banners = await prisma.banner.count();

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

async function runPhase2Tests() {
  console.log('============================================================');
  console.log('FSO PHASE 2 AUTOMATED VERIFICATION SUITE');
  console.log('============================================================\n');

  // Step 0: Record initial counts
  console.log('1. Checking initial Neon database counts...');
  const initialCounts = await getNeonCounts();
  console.log('   Current Database Counts:');
  console.log(`   - Users: ${initialCounts.users}`);
  console.log(`   - Vendors: ${initialCounts.vendors}`);
  console.log(`   - Products: ${initialCounts.products}`);
  console.log(`   - Categories: ${initialCounts.categories}`);
  console.log(`   - Orders: ${initialCounts.orders}`);
  console.log(`   - Reviews: ${initialCounts.reviews}`);
  console.log(`   - Articles: ${initialCounts.articles}`);
  console.log(`   - Recipes: ${initialCounts.recipes}`);
  console.log(`   - Ingredients: ${initialCounts.ingredients}`);
  console.log(`   - Collections: ${initialCounts.collections}`);
  console.log(`   - Banners: ${initialCounts.banners}\n`);

  recordTest('Neon Database Online & Accessible', initialCounts.products > 0, `Found ${initialCounts.products} live products`);

  // Build Express test app
  const app = express();
  app.use(express.json());
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/producers', producerRoutes);
  app.use('/api/v1/collections', collectionRoutes);

  // Protected cart route mock for user
  const customerUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  const appWithCart = express();
  appWithCart.use(express.json());
  appWithCart.use((req, res, next) => {
    req.user = customerUser;
    next();
  });
  appWithCart.use('/api/v1/cart', cartRoutes);

  // Test 1: Category list contract
  console.log('\n2. Verifying Category List Contract...');
  const catRes = await request(app).get('/api/v1/products/categories');
  const catList = Array.isArray(catRes.body) ? catRes.body : (catRes.body?.data || []);
  recordTest('GET /api/v1/products/categories returns 200', catRes.status === 200);
  recordTest('Categories count matches Neon (5)', catList.length === 5);

  const herbsCat = catList.find(c => c.slug === 'herbs-tisanes');
  recordTest('Canonical herbs-tisanes category has count = 1', herbsCat && (herbsCat.count === 1 || herbsCat.productCount === 1));
  const oilsCat = catList.find(c => c.slug === 'oils-ghee');
  recordTest('Canonical oils-ghee category has count = 0', oilsCat && (oilsCat.count === 0 || oilsCat.productCount === 0));

  // Test 2: Category filtering
  console.log('\n3. Verifying Category Filtering Contract...');
  const herbsFilterRes = await request(app).get('/api/v1/products?category=herbs-tisanes');
  recordTest('GET /api/v1/products?category=herbs-tisanes returns 200', herbsFilterRes.status === 200);
  const herbsProducts = Array.isArray(herbsFilterRes.body)
    ? herbsFilterRes.body
    : (herbsFilterRes.body.products || herbsFilterRes.body.data?.products || []);
  recordTest('herbs-tisanes returns exactly 1 product', herbsProducts.length === 1);
  recordTest('herbs-tisanes product is Wild Himalayan Stinging Nettle Tisane', herbsProducts[0]?.slug === 'wild-himalayan-stinging-nettle-tisane');

  const oilsFilterRes = await request(app).get('/api/v1/products?category=oils-ghee');
  const oilsProducts = Array.isArray(oilsFilterRes.body)
    ? oilsFilterRes.body
    : (oilsFilterRes.body.products || oilsFilterRes.body.data?.products || []);
  recordTest('oils-ghee returns empty products list (0)', oilsProducts.length === 0);

  // Test 3: Collection Detail & Products Contract
  console.log('\n4. Verifying Collection Contract & Relations...');
  const colRes = await request(app).get('/api/v1/collections/himalayan-morning-rituals-box');
  recordTest('GET /api/v1/collections/himalayan-morning-rituals-box returns 200', colRes.status === 200);
  const colData = colRes.body.data || colRes.body;
  recordTest('Collection has canonical products array', Array.isArray(colData?.products));
  recordTest('Collection contains both linked products (2)', colData?.products?.length === 2);
  const colProdSlugs = (colData?.products || []).map(p => p.slug);
  recordTest('Collection includes pure-kashmiri-mongra-saffron-grade-1', colProdSlugs.includes('pure-kashmiri-mongra-saffron-grade-1'));
  recordTest('Collection includes wild-himalayan-stinging-nettle-tisane', colProdSlugs.includes('wild-himalayan-stinging-nettle-tisane'));

  // Test 4: Collections List
  console.log('\n5. Verifying Collections List Contract...');
  const colsRes = await request(app).get('/api/v1/collections');
  recordTest('GET /api/v1/collections returns 200', colsRes.status === 200);
  const colsList = Array.isArray(colsRes.body.data) ? colsRes.body.data : colsRes.body;
  recordTest('Collections count is 1', Array.isArray(colsList) && colsList.length === 1);

  // Test 5: Producers List and Detail
  console.log('\n6. Verifying Producers Discovery Contract...');
  const producersRes = await request(app).get('/api/v1/producers');
  recordTest('GET /api/v1/producers returns 200', producersRes.status === 200);
  const prodList = Array.isArray(producersRes.body.data) ? producersRes.body.data : producersRes.body;
  recordTest('Producers count is 2', Array.isArray(prodList) && prodList.length === 2);

  const kashmirProducerRes = await request(app).get('/api/v1/producers/kashmir-saffron-heritage-artisans');
  recordTest('GET /api/v1/producers/kashmir-saffron-heritage-artisans returns 200', kashmirProducerRes.status === 200);
  const kashmirData = kashmirProducerRes.body.data || kashmirProducerRes.body;
  recordTest('Kashmir producer businessName matches', kashmirData?.businessName === 'Kashmir Saffron & Heritage Artisans');

  const pahadiProducerRes = await request(app).get('/api/v1/producers/pahadi-amrut-forest-collective');
  recordTest('GET /api/v1/producers/pahadi-amrut-forest-collective returns 200', pahadiProducerRes.status === 200);
  const pahadiData = pahadiProducerRes.body.data || pahadiProducerRes.body;
  recordTest('Pahadi producer businessName matches', pahadiData?.businessName === 'Pahadi Amrut Forest Collective');

  // Test 6: Producer Products
  console.log('\n7. Verifying Producer Products Contract...');
  const pahadiProductsRes = await request(app).get('/api/v1/producers/pahadi-amrut-forest-collective/products');
  recordTest('GET /api/v1/producers/pahadi-amrut-forest-collective/products returns 200', pahadiProductsRes.status === 200);
  const pahadiProdData = pahadiProductsRes.body.data || pahadiProductsRes.body;
  recordTest('Pahadi producer has 1 linked product', pahadiProdData?.products?.length === 1);
  recordTest('Pahadi product is wild-himalayan-stinging-nettle-tisane', pahadiProdData?.products?.[0]?.slug === 'wild-himalayan-stinging-nettle-tisane');

  // Test 7: Product Detail
  console.log('\n8. Verifying Product Detail Contract...');
  const saffronRes = await request(app).get('/api/v1/products/pure-kashmiri-mongra-saffron-grade-1');
  recordTest('GET /api/v1/products/pure-kashmiri-mongra-saffron-grade-1 returns 200', saffronRes.status === 200);
  const saffronData = saffronRes.body.data || saffronRes.body;
  recordTest('Product has valid price (680)', saffronData?.price === 680);
  recordTest('Product has linked vendor', !!saffronData?.vendor);
  recordTest('Vendor slug is kashmir-saffron-heritage-artisans', saffronData?.vendor?.slug === 'kashmir-saffron-heritage-artisans');

  // Test 8: Cart Resolution by Slug
  console.log('\n9. Verifying Cart Resolution by Slug & CUID...');
  const { generateAccessToken } = require('../services/tokenService');
  const userToken = generateAccessToken(customerUser.id, customerUser.role);

  // Clean test user cart beforehand
  const userCart = await prisma.cart.findUnique({ where: { userId: customerUser.id } });
  if (userCart) {
    await prisma.cartItem.deleteMany({ where: { cartId: userCart.id } });
  }

  const cartAddRes = await request(appWithCart)
    .post('/api/v1/cart')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      productId: 'wild-himalayan-stinging-nettle-tisane',
      quantity: 2
    });
  recordTest('POST /api/v1/cart by slug returns 200', cartAddRes.status === 200);
  const cartItems = Array.isArray(cartAddRes.body)
    ? cartAddRes.body
    : (cartAddRes.body.items || cartAddRes.body.data?.items || []);
  const addedItem = cartItems.find(i => i.slug === 'wild-himalayan-stinging-nettle-tisane');
  recordTest('Cart item resolved to correct product CUID', !!addedItem && !!addedItem.productId);
  recordTest('Cart item quantity is 2', addedItem && (addedItem.quantity === 2 || addedItem.qty === 2));

  // Clean up cart item to keep Neon unchanged
  if (userCart) {
    await prisma.cartItem.deleteMany({ where: { cartId: userCart.id } });
  }

  // Step 10: Invariant check on Neon counts
  console.log('\n10. Checking post-verification Neon database counts...');
  const finalCounts = await getNeonCounts();
  let countsMatch = true;
  for (const [key, val] of Object.entries(initialCounts)) {
    if (finalCounts[key] !== val) {
      countsMatch = false;
      console.error(`   Count mismatch on ${key}: was ${val}, now ${finalCounts[key]}`);
    }
  }
  recordTest('Database Record Counts 100% Invariant (Zero Synthetic Data Inserted)', countsMatch);

  console.log('\n============================================================');
  console.log(`SUMMARY: ${testResults.passed} passed, ${testResults.failed} failed out of ${testResults.passed + testResults.failed} tests`);
  console.log('============================================================');

  if (testResults.failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests()
  .catch((err) => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
