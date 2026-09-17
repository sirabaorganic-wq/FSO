/**
 * Phase 2 Customer Storefront Puppeteer Headless Browser E2E Verification
 *
 * Runs full browser-level tests against Next.js (port 3000) and Backend (port 5000):
 * - Verifies real DOM rendering with live Neon PostgreSQL data
 * - Verifies zero mock / fallback commerce data
 * - Verifies user interaction (Add to Cart -> Cart Page verification)
 * - Asserts database record count invariants
 */

const puppeteer = require('puppeteer');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = require('../config/prisma');

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

  return { users, vendors, products, categories, orders, reviews, articles, recipes, ingredients, collections, banners };
}

async function runBrowserE2E() {
  console.log('============================================================');
  console.log('FSO PHASE 2 PUPPETEER BROWSER E2E VERIFICATION');
  console.log('============================================================\n');

  console.log('1. Checking initial Neon database counts...');
  const initialCounts = await getNeonCounts();
  console.log(`   Users: ${initialCounts.users}, Vendors: ${initialCounts.vendors}, Products: ${initialCounts.products}, Categories: ${initialCounts.categories}\n`);

  recordTest('Neon Database Invariant Baseline Established', initialCounts.products === 2 && initialCounts.vendors === 2);

  console.log('2. Launching headless Chromium browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Collect page console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore unsplash 404 image errors in console
      if (!text.includes('images.unsplash.com') && !text.includes('Failed to load resource')) {
        console.log(`   [Browser Console Error]: ${text.slice(0, 150)}`);
      }
    }
  });

  try {
    // 3. Homepage
    console.log('\n3. Testing Homepage (http://localhost:3000)...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    const homeContent = await page.content();

    recordTest('Homepage loaded with HTTP 200', !homeContent.includes('Internal Server Error'));
    recordTest('Homepage renders Pure Kashmiri Mongra Saffron (Grade 1)', homeContent.includes('Pure Kashmiri Mongra Saffron (Grade 1)'));
    recordTest('Homepage renders Wild Himalayan Stinging Nettle Tisane', homeContent.includes('Wild Himalayan Stinging Nettle Tisane'));
    recordTest('Homepage renders Kashmir Saffron & Heritage Artisans', homeContent.includes('Kashmir Saffron &amp; Heritage Artisans') || homeContent.includes('Kashmir Saffron & Heritage Artisans'));
    recordTest('Homepage renders Pahadi Amrut Forest Collective', homeContent.includes('Pahadi Amrut Forest Collective'));
    recordTest('Homepage excludes mock Cold-Pressed Groundnut Oil', !homeContent.includes('Cold-Pressed Groundnut Oil'));
    recordTest('Homepage excludes mock Bansi Gold Wheat Flour', !homeContent.includes('Bansi Gold Wheat Flour'));

    // 4. Category Page: herbs-tisanes
    console.log('\n4. Testing Category Page: herbs-tisanes (http://localhost:3000/shop/category/herbs-tisanes)...');
    await page.goto('http://localhost:3000/shop/category/herbs-tisanes', { waitUntil: 'networkidle2', timeout: 30000 });
    const herbsContent = await page.content();

    recordTest('Category herbs-tisanes renders Wild Himalayan Stinging Nettle Tisane', herbsContent.includes('Wild Himalayan Stinging Nettle Tisane'));
    recordTest('Category herbs-tisanes renders authentic price 340', herbsContent.includes('340'));

    // 5. Empty Category Page: oils-ghee
    console.log('\n5. Testing Empty Category Page: oils-ghee (http://localhost:3000/shop/category/oils-ghee)...');
    await page.goto('http://localhost:3000/shop/category/oils-ghee', { waitUntil: 'networkidle2', timeout: 30000 });
    const oilsContent = await page.content();

    recordTest('Category oils-ghee displays authentic empty state', oilsContent.includes('No ingredients currently in this harvest') || oilsContent.includes('No ingredients found'));
    recordTest('Category oils-ghee excludes mock Groundnut Oil', !oilsContent.includes('Cold-Pressed Groundnut Oil'));

    // 6. Product Detail Page
    console.log('\n6. Testing Product Detail Page (http://localhost:3000/shop/product/pure-kashmiri-mongra-saffron-grade-1)...');
    await page.goto('http://localhost:3000/shop/product/pure-kashmiri-mongra-saffron-grade-1', { waitUntil: 'networkidle2', timeout: 30000 });
    const saffronContent = await page.content();

    recordTest('Product page renders title Pure Kashmiri Mongra Saffron (Grade 1)', saffronContent.includes('Pure Kashmiri Mongra Saffron (Grade 1)'));
    recordTest('Product page renders live price 680', saffronContent.includes('680'));
    recordTest('Product page renders producer Kashmir Saffron & Heritage Artisans', saffronContent.includes('Kashmir Saffron &amp; Heritage Artisans') || saffronContent.includes('Kashmir Saffron & Heritage Artisans'));

    // 7. Add to Basket Interaction
    console.log('\n7. Testing Add to Basket interaction...');
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent && b.textContent.toLowerCase().includes('add to basket'));
    }, { timeout: 10000 });

    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('add to basket'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    recordTest('Add to basket button found and clicked', clicked);
    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

    const storedCart = await page.evaluate(() => localStorage.getItem('fso_guest_cart'));
    console.log('   LocalStorage Cart after click:', storedCart);
    recordTest('CartContext saved authentic product to localStorage', storedCart && storedCart.includes('pure-kashmiri-mongra-saffron-grade-1'));

    // 8. Cart Page Verification
    console.log('\n8. Testing Cart Page (http://localhost:3000/cart)...');
    await page.goto('http://localhost:3000/cart', { waitUntil: 'networkidle2', timeout: 30000 });
    const cartContent = await page.content();

    recordTest('Cart renders authentic product Pure Kashmiri Mongra Saffron', cartContent.includes('Pure Kashmiri Mongra Saffron'));
    recordTest('Cart renders authentic price 680', cartContent.includes('680'));
    recordTest('Cart excludes fabricated "Considered Ingredient"', !cartContent.includes('Considered Ingredient'));
    recordTest('Cart excludes fabricated ₹480 price', !cartContent.includes('₹480'));

    // 9. Producer Detail Page
    console.log('\n9. Testing Producer Profile (http://localhost:3000/producers/pahadi-amrut-forest-collective)...');
    await page.goto('http://localhost:3000/producers/pahadi-amrut-forest-collective', { waitUntil: 'networkidle2', timeout: 30000 });
    const producerContent = await page.content();

    recordTest('Producer profile renders Pahadi Amrut Forest Collective', producerContent.includes('Pahadi Amrut Forest Collective'));
    recordTest('Producer profile renders Chamoli / Uttarakhand location', producerContent.includes('Chamoli') || producerContent.includes('Uttarakhand'));
    recordTest('Producer profile displays linked Wild Himalayan Stinging Nettle Tisane', producerContent.includes('Wild Himalayan Stinging Nettle Tisane'));

    // 10. Collection Detail Page
    console.log('\n10. Testing Collection Detail (http://localhost:3000/shop/collection/himalayan-morning-rituals-box)...');
    await page.goto('http://localhost:3000/shop/collection/himalayan-morning-rituals-box', { waitUntil: 'networkidle2', timeout: 30000 });
    const colContent = await page.content();

    recordTest('Collection page renders Himalayan Morning Rituals Box', colContent.includes('Himalayan Morning Rituals Box'));
    recordTest('Collection page includes linked Pure Kashmiri Mongra Saffron', colContent.includes('Pure Kashmiri Mongra Saffron (Grade 1)'));
    recordTest('Collection page includes linked Wild Himalayan Stinging Nettle Tisane', colContent.includes('Wild Himalayan Stinging Nettle Tisane'));

    // 11. Redirection test
    console.log('\n11. Testing Redundant Route Redirection (/collections/slug)...');
    const redirectRes = await page.goto('http://localhost:3000/collections/himalayan-morning-rituals-box', { waitUntil: 'networkidle2', timeout: 30000 });
    const finalUrl = page.url();
    recordTest('Legacy /collections/:slug redirects to /shop/collection/:slug', finalUrl.includes('/shop/collection/himalayan-morning-rituals-box'));

  } finally {
    console.log('\n12. Closing browser...');
    await browser.close();
  }

  // 13. Final Invariant Check
  console.log('\n13. Checking post-verification Neon database counts...');
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

runBrowserE2E()
  .catch((err) => {
    console.error('Browser E2E fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
