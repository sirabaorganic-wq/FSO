/**
 * ============================================================
 *  QA Test: Dynamic Shipping Estimation Logic
 *  File   : tests/shipping_estimation.test.js
 *  Run    : node tests/shipping_estimation.test.js
 * ============================================================
 *
 *  Tests the calculateShipping() function directly.
 *  Mocks: Shiprocket API, MongoDB (Product/Vendor/SiteSettings).
 */

'use strict';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

const PASS = `${GREEN}${BOLD}[ PASS ]${RESET}`;
const FAIL = `${RED}${BOLD}[ FAIL ]${RESET}`;
const INFO = `${CYAN}[ INFO ]${RESET}`;

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${PASS}  ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL}  ${label}`);
    if (detail) console.log(`         ${RED}↳ ${detail}${RESET}`);
    failed++;
    failures.push({ label, detail });
  }
}

// ─── MOCK DATA ────────────────────────────────────────────────

const VENDOR_A = {
  _id: 'vendor_a_id',
  businessName: 'Green Organic Farm',
  address: { postalCode: '201301' },
  shiprocket_pickup_code: 'VEND_NOIDA_01',
};

const VENDOR_B = {
  _id: 'vendor_b_id',
  businessName: 'Kerala Spice Gardens',
  address: { postalCode: '682001' },
  shiprocket_pickup_code: 'VEND_KOCHI_01',
};

const PRODUCT_HONEY = {
  _id: 'prod_honey',
  name: 'Organic Raw Honey',
  price: 799,
  vendor: VENDOR_A,
  isVendorProduct: true,
};

const PRODUCT_PEPPER = {
  _id: 'prod_pepper',
  name: 'Black Pepper 100g',
  price: 299,
  vendor: VENDOR_B,
  isVendorProduct: true,
};

const PRODUCT_ADMIN = {
  _id: 'prod_admin_ghee',
  name: 'Organic Ghee',
  price: 450,
  vendor: null,
  isVendorProduct: false,
};

// Shiprocket mock courier responses per route
const COURIER_NOIDA_TO_BLR = {
  rate: 55,
  courier_name: 'Delhivery',
  etd: '3-5 days',
  etd_hours: 72,
  rating: 4.2,
};
const COURIER_KOCHI_TO_BLR = {
  rate: 42,
  courier_name: 'Ecom Express',
  etd: '2-4 days',
  etd_hours: 48,
  rating: 4.0,
};

// ─── MOCK MODULE SYSTEM ──────────────────────────────────────

const Module = require('module');
const _origRequire = Module.prototype.require;

const mockProducts = [PRODUCT_HONEY, PRODUCT_PEPPER, PRODUCT_ADMIN];
let shiprocketCallCount = 0;
let shiprocketShouldFail = false;
let siteSettingsOverride = null;

// Create mock mongoose model pattern
function createMockModel(name, data) {
  const model = function() {};
  model.find = function(query) {
    const ids = query?._id?.$in || [];
    const results = data.filter(d => ids.includes(d._id));
    return {
      populate: function() { return Promise.resolve(results); },
      lean: function() { return Promise.resolve(results); },
      then: function(resolve) { return resolve(results); },
    };
  };
  model.findOne = function(query) {
    return {
      lean: function() {
        if (siteSettingsOverride !== null) return Promise.resolve(siteSettingsOverride);
        return Promise.resolve({
          type: 'home',
          shippingConfig: {
            freeShippingThreshold: 999,
            platformHandlingFeeFlat: 25,
            platformHandlingFeePercent: 5,
            codSurcharge: 40,
            flatRateFallback: 70,
            weightPerItem: 0.5,
            isEnabled: true,
          }
        });
      },
    };
  };
  return model;
}

const mockShiprocketService = {
  checkServiceability: async ({ pickup_postcode, delivery_postcode, weight, cod }) => {
    shiprocketCallCount++;
    if (shiprocketShouldFail) throw new Error('Shiprocket API unavailable');
    if (pickup_postcode === '201301') return COURIER_NOIDA_TO_BLR;
    if (pickup_postcode === '682001') return COURIER_KOCHI_TO_BLR;
    return { rate: 60, courier_name: 'BlueDart', etd: '4-6 days' };
  },
};

Module.prototype.require = function(id) {
  if (id === '../services/shiprocketService' || id.endsWith('services/shiprocketService')) return mockShiprocketService;
  if (id === '../middleware/authMiddleware' || id.endsWith('middleware/authMiddleware')) return { protect: (req, res, next) => next() };
  if (id === 'express') {
    const express = _origRequire.apply(this, ['express']);
    return express;
  }
  return _origRequire.apply(this, arguments);
};

// Load the module under test
let calculateShipping;
try {
  const routePath = require.resolve('../routes/shippingRoutes');
  delete require.cache[routePath];
  const shippingRoutes = require('../routes/shippingRoutes');
  calculateShipping = shippingRoutes.calculateShipping;
} finally {
  Module.prototype.require = _origRequire;
}

// ─── TEST RUNNER ──────────────────────────────────────────────

async function runTests() {
  console.log();
  console.log(`${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║  QA AUTOMATION – Dynamic Shipping Estimation Tests         ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}`);
  console.log();

  // ── TEST 1: Single vendor, below free threshold ──────────
  console.log(`${BOLD}━━ Test 1: Single Vendor Order (Below Free Threshold) ━━━━━━━━${RESET}`);
  shiprocketCallCount = 0;
  shiprocketShouldFail = false;
  siteSettingsOverride = null;

  const result1 = await calculateShipping(
    [{ product: 'prod_honey', quantity: 1, price: 799 }],
    '560102',
    'Online'
  );

  console.log(`  ${INFO} Result: ${JSON.stringify(result1, null, 2).split('\n').join('\n         ')}`);
  console.log();

  assert('totalShipping > 0 (not free)', result1.totalShipping > 0, `Got ${result1.totalShipping}`);
  assert('isFreeShipping is false', result1.isFreeShipping === false);
  assert('amountToFreeShipping = 200 (999-799)', result1.amountToFreeShipping === 200, `Got ${result1.amountToFreeShipping}`);
  assert('vendorBreakdown has 1 entry', result1.vendorBreakdown.length === 1, `Got ${result1.vendorBreakdown.length}`);
  assert('Vendor name is Green Organic Farm', result1.vendorBreakdown[0].vendorName === 'Green Organic Farm');
  assert('courierRate is 55 (from mock)', result1.vendorBreakdown[0].courierRate === 55, `Got ${result1.vendorBreakdown[0].courierRate}`);
  // handlingFee = 25 flat + (55 * 5/100) = 25 + 2.75 = 27.75 → rounded to 28
  assert('handlingFee = 28 (25 + 5% of 55)', result1.vendorBreakdown[0].handlingFee === 28, `Got ${result1.vendorBreakdown[0].handlingFee}`);
  // subtotal = 55 + 28 = 83
  assert('vendor subtotal = 83 (55 + 28)', result1.vendorBreakdown[0].subtotal === 83, `Got ${result1.vendorBreakdown[0].subtotal}`);
  assert('totalShipping = 83 (single vendor, no COD)', result1.totalShipping === 83, `Got ${result1.totalShipping}`);
  assert('codSurcharge = 0 for Online payment', result1.codSurcharge === 0, `Got ${result1.codSurcharge}`);
  assert('Shiprocket API was called', shiprocketCallCount > 0);

  console.log();

  // ── TEST 2: Free shipping (above threshold) ─────────────
  console.log(`${BOLD}━━ Test 2: Order Above Free Shipping Threshold (₹999+) ━━━━━━${RESET}`);
  shiprocketCallCount = 0;

  const result2 = await calculateShipping(
    [{ product: 'prod_honey', quantity: 2, price: 799 }], // 799*2 = 1598 > 999
    '560102',
    'Online'
  );

  assert('isFreeShipping is true', result2.isFreeShipping === true);
  assert('totalShipping = 0', result2.totalShipping === 0, `Got ${result2.totalShipping}`);
  assert('amountToFreeShipping = 0', result2.amountToFreeShipping === 0);
  assert('Shiprocket API was NOT called (unnecessary)', shiprocketCallCount === 0);

  console.log();

  // ── TEST 3: Multi-vendor order ──────────────────────────
  console.log(`${BOLD}━━ Test 3: Multi-Vendor Order (2 vendors + platform) ━━━━━━━━${RESET}`);
  shiprocketCallCount = 0;

  const result3 = await calculateShipping(
    [
      { product: 'prod_honey', quantity: 1, price: 200 },   // Vendor A - low price to stay under threshold
      { product: 'prod_pepper', quantity: 1, price: 150 },   // Vendor B
      { product: 'prod_admin_ghee', quantity: 1, price: 100 }, // Platform
    ],
    '560102',
    'Online'
  );

  assert('vendorBreakdown has 3 entries (2 vendors + platform)', result3.vendorBreakdown.length === 3, `Got ${result3.vendorBreakdown.length}`);
  assert('totalShipping is sum of all vendor subtotals', result3.totalShipping > 0);

  const vendorAEntry = result3.vendorBreakdown.find(v => v.vendorName === 'Green Organic Farm');
  const vendorBEntry = result3.vendorBreakdown.find(v => v.vendorName === 'Kerala Spice Gardens');
  const platformEntry = result3.vendorBreakdown.find(v => v.vendorName === 'Siraba Organic');

  assert('Vendor A found in breakdown', !!vendorAEntry);
  assert('Vendor B found in breakdown', !!vendorBEntry);
  assert('Platform entry found in breakdown', !!platformEntry);

  if (vendorAEntry) {
    assert('Vendor A rate = 55 (Noida→Bangalore)', vendorAEntry.courierRate === 55, `Got ${vendorAEntry.courierRate}`);
  }
  if (vendorBEntry) {
    assert('Vendor B rate = 42 (Kochi→Bangalore)', vendorBEntry.courierRate === 42, `Got ${vendorBEntry.courierRate}`);
  }
  if (platformEntry) {
    assert('Platform uses fallback rate = 70', platformEntry.courierRate === 70, `Got ${platformEntry.courierRate}`);
  }

  console.log();

  // ── TEST 4: COD surcharge ───────────────────────────────
  console.log(`${BOLD}━━ Test 4: COD Payment Adds Surcharge ━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);

  const resultCOD = await calculateShipping(
    [{ product: 'prod_honey', quantity: 1, price: 799 }],
    '560102',
    'COD'
  );

  assert('codSurcharge = 40 for COD', resultCOD.codSurcharge === 40, `Got ${resultCOD.codSurcharge}`);
  assert('totalShipping includes COD surcharge', resultCOD.totalShipping === 83 + 40, `Got ${resultCOD.totalShipping}, expected ${83 + 40}`);

  console.log();

  // ── TEST 5: Shiprocket API failure → fallback ───────────
  console.log(`${BOLD}━━ Test 5: Shiprocket API Failure → Flat Rate Fallback ━━━━━━━${RESET}`);
  shiprocketShouldFail = true;

  const resultFail = await calculateShipping(
    [{ product: 'prod_honey', quantity: 1, price: 799 }],
    '560102',
    'Online'
  );

  assert('Calculation does NOT throw (graceful degradation)', resultFail !== null);
  assert('Uses flatRateFallback (70)', resultFail.vendorBreakdown[0].courierRate === 70, `Got ${resultFail.vendorBreakdown[0].courierRate}`);
  // fallback: 70 + (25 + 70*5/100) = 70 + 25 + 3.5 = 70 + 29 = 99
  assert('handlingFee on fallback = 29 (25 + 5% of 70)', resultFail.vendorBreakdown[0].handlingFee === 29, `Got ${resultFail.vendorBreakdown[0].handlingFee}`);

  shiprocketShouldFail = false;
  console.log();

  // ── TEST 6: Shipping disabled by admin ──────────────────
  console.log(`${BOLD}━━ Test 6: Admin Disabled Shipping Charges ━━━━━━━━━━━━━━━━━━${RESET}`);
  siteSettingsOverride = {
    type: 'home',
    shippingConfig: {
      freeShippingThreshold: 999,
      platformHandlingFeeFlat: 25,
      platformHandlingFeePercent: 5,
      codSurcharge: 40,
      flatRateFallback: 70,
      weightPerItem: 0.5,
      isEnabled: false, // DISABLED
    }
  };

  const resultDisabled = await calculateShipping(
    [{ product: 'prod_honey', quantity: 1, price: 799 }],
    '560102',
    'Online'
  );

  assert('totalShipping = 0 when disabled', resultDisabled.totalShipping === 0);
  assert('isFreeShipping = true when disabled', resultDisabled.isFreeShipping === true);

  siteSettingsOverride = null;
  console.log();

  // ── FINAL REPORT ────────────────────────────────────────
  const total = passed + failed;
  const status = failed === 0 ? `${GREEN}${BOLD}ALL TESTS PASSED${RESET}` : `${RED}${BOLD}SOME TESTS FAILED${RESET}`;

  console.log(`${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║                     FINAL TEST REPORT                      ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}`);
  console.log();
  console.log(`  Status  : ${status}`);
  console.log(`  Passed  : ${GREEN}${passed}${RESET} / ${total}`);
  console.log(`  Failed  : ${failed > 0 ? RED : GREEN}${failed}${RESET} / ${total}`);
  console.log();

  if (failures.length > 0) {
    console.log(`${RED}${BOLD}  Failed Assertions:${RESET}`);
    failures.forEach((f, i) => {
      console.log(`    ${i + 1}. ${f.label}`);
      if (f.detail) console.log(`       ${RED}↳ ${f.detail}${RESET}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error(`${RED}${BOLD}FATAL:${RESET}`, err);
  process.exit(1);
});
