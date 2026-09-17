/**
 * Phase 2: Customer Storefront E2E Verification Suite
 *
 * Runs end-to-end verification against live backend (port 5000) and Next.js frontend (port 3000):
 * - Starts backend and frontend processes
 * - Awaits readiness
 * - Verifies rendered SSR pages for live Neon-backed data and zero mock commerce fallbacks
 * - Shuts down processes cleanly
 * - Asserts database record count invariants
 */

const { spawn } = require('child_process');
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 45000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 304) {
        return true;
      }
    } catch {
      // Waiting for server
    }
    await sleep(1000);
  }
  return false;
}

function killPort(port) {
  try {
    const stdout = require('child_process').execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') {
        try {
          require('child_process').execSync(`taskkill /pid ${pid} /f /t`, { stdio: 'ignore' });
        } catch {}
      }
    }
  } catch {}
}

async function runE2EVerification() {
  console.log('============================================================');
  console.log('FSO PHASE 2 CUSTOMER STOREFRONT E2E VERIFICATION');
  console.log('============================================================\n');

  console.log('1. Checking initial Neon database counts...');
  const initialCounts = await getNeonCounts();
  console.log(`   Products: ${initialCounts.products}, Vendors: ${initialCounts.vendors}, Categories: ${initialCounts.categories}\n`);

  // Ensure ports 5000 and 3000 are clean
  killPort(5000);
  killPort(3000);
  await sleep(1000);

  console.log('2. Starting Backend server on port 5000...');
  const backendProcess = spawn('cmd.exe', ['/c', 'node', 'server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
  });

  const backendReady = await waitForUrl('http://localhost:5000/api/v1/health', 30000);
  recordTest('Backend Server Online (port 5000)', backendReady);
  if (!backendReady) {
    throw new Error('Backend failed to start on port 5000');
  }

  console.log('\n3. Starting Next.js Frontend dev server on port 3000...');
  const frontendProcess = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], {
    cwd: path.join(__dirname, '..', '..', 'client'),
    stdio: 'ignore',
  });

  const frontendReady = await waitForUrl('http://localhost:3000', 45000);
  recordTest('Next.js Frontend Server Online (port 3000)', frontendReady);
  if (!frontendReady) {
    throw new Error('Next.js frontend failed to start on port 3000');
  }

  try {
    // Test 1: Homepage Live Data
    console.log('\n4. Verifying Rendered Homepage (http://localhost:3000)...');
    const homeRes = await fetch('http://localhost:3000');
    const homeHtml = await homeRes.text();
    recordTest('Homepage HTTP 200 OK', homeRes.status === 200);
    recordTest('Homepage renders Pure Kashmiri Mongra Saffron', homeHtml.includes('Pure Kashmiri Mongra Saffron (Grade 1)'));
    recordTest('Homepage renders Wild Himalayan Stinging Nettle Tisane', homeHtml.includes('Wild Himalayan Stinging Nettle Tisane'));
    recordTest('Homepage renders Kashmir Saffron & Heritage Artisans', homeHtml.includes('Kashmir Saffron &amp; Heritage Artisans') || homeHtml.includes('Kashmir Saffron & Heritage Artisans'));
    recordTest('Homepage renders Pahadi Amrut Forest Collective', homeHtml.includes('Pahadi Amrut Forest Collective'));
    recordTest('Homepage excludes mock Cold-Pressed Groundnut Oil', !homeHtml.includes('Cold-Pressed Groundnut Oil'));
    recordTest('Homepage excludes mock Bansi Gold Wheat Flour', !homeHtml.includes('Bansi Gold Wheat Flour'));

    // Test 2: Category Page herbs-tisanes
    console.log('\n5. Verifying Rendered Category Page herbs-tisanes...');
    const herbsRes = await fetch('http://localhost:3000/shop/category/herbs-tisanes');
    const herbsHtml = await herbsRes.text();
    recordTest('Category herbs-tisanes HTTP 200 OK', herbsRes.status === 200);
    recordTest('Category page renders Wild Himalayan Stinging Nettle Tisane', herbsHtml.includes('Wild Himalayan Stinging Nettle Tisane'));
    recordTest('Category page displays live price 340', herbsHtml.includes('340'));

    // Test 3: Empty Category Page oils-ghee
    console.log('\n6. Verifying Rendered Empty Category Page oils-ghee...');
    const oilsRes = await fetch('http://localhost:3000/shop/category/oils-ghee');
    const oilsHtml = await oilsRes.text();
    recordTest('Category oils-ghee HTTP 200 OK', oilsRes.status === 200);
    recordTest('Empty category shows authentic empty state', oilsHtml.includes('No ingredients found') || oilsHtml.includes('No products found') || oilsHtml.includes('No ingredients yet'));
    recordTest('Empty category excludes mock products', !oilsHtml.includes('Cold-Pressed Groundnut Oil'));

    // Test 4: Product Detail Page
    console.log('\n7. Verifying Rendered Product Detail Page...');
    const prodRes = await fetch('http://localhost:3000/shop/product/pure-kashmiri-mongra-saffron-grade-1');
    const prodHtml = await prodRes.text();
    recordTest('Product page HTTP 200 OK', prodRes.status === 200);
    recordTest('Product page renders live price 680', prodHtml.includes('680'));
    recordTest('Product page renders Pampore GI-Certified', prodHtml.includes('Pampore GI-Certified') || prodHtml.includes('Pampore'));
    recordTest('Product page renders producer Kashmir Saffron & Heritage Artisans', prodHtml.includes('Kashmir Saffron &amp; Heritage Artisans') || prodHtml.includes('Kashmir Saffron & Heritage Artisans'));

    // Test 5: Producer Detail Page
    console.log('\n8. Verifying Rendered Producer Profile Page...');
    const producerRes = await fetch('http://localhost:3000/producers/pahadi-amrut-forest-collective');
    const producerHtml = await producerRes.text();
    recordTest('Producer profile HTTP 200 OK', producerRes.status === 200);
    recordTest('Producer profile renders Pahadi Amrut Forest Collective', producerHtml.includes('Pahadi Amrut Forest Collective'));
    recordTest('Producer profile renders Chamoli / Uttarakhand', producerHtml.includes('Chamoli') || producerHtml.includes('Uttarakhand'));
    recordTest('Producer profile links Wild Himalayan Stinging Nettle Tisane', producerHtml.includes('Wild Himalayan Stinging Nettle Tisane'));

    // Test 6: Collection Page
    console.log('\n9. Verifying Rendered Collection Page...');
    const colRes = await fetch('http://localhost:3000/shop/collection/himalayan-morning-rituals-box');
    const colHtml = await colRes.text();
    recordTest('Collection page HTTP 200 OK', colRes.status === 200);
    recordTest('Collection page renders Himalayan Morning Rituals Box', colHtml.includes('Himalayan Morning Rituals Box'));
    recordTest('Collection page includes Pure Kashmiri Mongra Saffron', colHtml.includes('Pure Kashmiri Mongra Saffron (Grade 1)'));
    recordTest('Collection page includes Wild Himalayan Stinging Nettle Tisane', colHtml.includes('Wild Himalayan Stinging Nettle Tisane'));

    // Test 7: Redundant Route Redirect
    console.log('\n10. Verifying Collection Route Redirection (/collections/slug -> /shop/collection/slug)...');
    const redirectRes = await fetch('http://localhost:3000/collections/himalayan-morning-rituals-box', {
      redirect: 'manual'
    });
    recordTest('Legacy /collections/:slug redirects to /shop/collection/:slug', [301, 302, 307, 308].includes(redirectRes.status));

  } finally {
    console.log('\n11. Shutting down test servers...');
    killPort(5000);
    killPort(3000);
    await sleep(2000);
  }

  // Final Invariant Check
  console.log('\n12. Checking post-verification Neon database counts...');
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

runE2EVerification()
  .catch((err) => {
    console.error('E2E Verification fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
