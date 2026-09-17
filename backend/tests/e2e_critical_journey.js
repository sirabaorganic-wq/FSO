/**
 * Phase 12 End-to-End Critical Customer Journey Verification
 *
 * Executes the complete customer path against live Express + Neon PostgreSQL:
 * 1. Health & DB verification
 * 2. Catalog & Category APIs
 * 3. Product detail by slug (with 404 check verifying ZERO mock fallback)
 * 4. Producer provenance profile
 * 5. Search API
 * 6. Customer Authentication (Login & Profile retrieval)
 * 7. Cart synchronization & persistence
 * 8. Order creation with multi-vendor distribution
 * 9. Protected order detail vs public tracking route safety
 * 10. Customer Order History
 * 11. Customer Product Review submission & retrieval
 */

const BASE_URL = 'http://localhost:5000/api/v1';

async function runJourney() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  FSO PHASE 12: CRITICAL CUSTOMER JOURNEY E2E VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  let failed = false;
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      failed = true;
      throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  ✓ ${message}`);
  }

  // 1. Health check
  console.log('Step 1: Backend & Neon PostgreSQL Health Check');
  const healthRes = await fetch(`${BASE_URL}/health`).then((r) => r.json());
  assert(healthRes.success === true, 'Health endpoint responds with success');
  assert(healthRes.data?.database === 'PostgreSQL', 'Database is authoritative PostgreSQL (Neon)');
  assert(healthRes.data?.status === 'UP', 'Service status is UP');

  // 2. Catalog
  console.log('\nStep 2: Shop Catalog & Categories');
  const productsRes = await fetch(`${BASE_URL}/products`).then((r) => r.json());
  const productsList = productsRes.products || productsRes.Products || productsRes.data || (Array.isArray(productsRes) ? productsRes : []);
  assert(Array.isArray(productsList) && productsList.length >= 2, `Retrieved ${productsList.length} live products from Neon`);

  const saffron = productsList.find((p) => p.slug === 'pure-kashmiri-mongra-saffron-grade-1');
  assert(saffron !== undefined, 'Live product "pure-kashmiri-mongra-saffron-grade-1" found in database');
  assert(saffron.price === 680, `Product price is real DB value: ₹${saffron.price}`);

  const categoriesRes = await fetch(`${BASE_URL}/products/categories`).then((r) => r.json());
  const categoriesList = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.data || []);
  assert(Array.isArray(categoriesList) && categoriesList.length > 0, `Retrieved ${categoriesList.length} live product categories`);

  // 3. Product Detail & Zero-Mock Fallback Check
  console.log('\nStep 3: Product Detail by Slug & Strict 404 Check');
  const rawProductDetail = await fetch(`${BASE_URL}/products/${saffron.slug}`).then((r) => r.json());
  const productDetail = rawProductDetail.data || rawProductDetail;
  assert(productDetail.name === 'Pure Kashmiri Mongra Saffron (Grade 1)', 'Product name matches real DB record');
  assert(productDetail.originState.includes('Kashmir'), 'Regional provenance reflects DB record');

  // Verify non-existent product returns 404 (ZERO mock fallback)
  const nonExistentRes = await fetch(`${BASE_URL}/products/completely-fake-product-slug-12345`);
  assert(nonExistentRes.status === 404, 'Non-existent product correctly returns HTTP 404 (No mock fallback)');

  // 4. Producer Profile
  console.log('\nStep 4: Producer & Provenance Information');
  const producersRes = await fetch(`${BASE_URL}/producers`).then((r) => r.json());
  assert(producersRes.success === true && Array.isArray(producersRes.data), 'Producers endpoint returns list');
  const producer = producersRes.data[0];
  assert(producer && producer.id, `Live producer loaded: "${producer.businessName}"`);

  const singleProducer = await fetch(`${BASE_URL}/producers/${producer.id}`).then((r) => r.json());
  assert(singleProducer.success === true, 'Single producer profile loaded by ID');
  assert(singleProducer.data.businessName === producer.businessName, 'Producer details match database');

  // 5. Unified Search
  console.log('\nStep 5: PostgreSQL Unified Search');
  const searchRes = await fetch(`${BASE_URL}/search?q=saffron`).then((r) => r.json());
  assert(searchRes.success === true, 'Search endpoint returns success');
  assert(searchRes.data?.results?.products?.length > 0, 'PostgreSQL ILIKE search successfully found saffron');

  // 6. Customer Authentication (Login & Profile)
  console.log('\nStep 6: Customer Authentication & Profile');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'demo_customer@fso.in',
      password: 'Customer_2026!',
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login Response:', loginRes.status, loginData);
  const token = loginData.token || loginData.accessToken || loginData.data?.token;
  assert(loginRes.status === 200 && Boolean(token), 'Customer login succeeded and returned token');
  assert(Boolean(token), 'JWT access token issued to customer');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Profile retrieval
  const rawProfile = await fetch(`${BASE_URL}/auth/profile`, { headers: authHeaders }).then((r) => r.json());
  const profile = rawProfile.data || rawProfile;
  assert(profile.email === 'demo_customer@fso.in', 'Profile returns correct customer email');
  assert(profile.role?.toUpperCase() === 'CUSTOMER', 'Customer role verified');

  // 7. Cart Synchronization
  console.log('\nStep 7: Customer Cart Persistence');
  const rawAddToCart = await fetch(`${BASE_URL}/cart`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      productId: saffron.id,
      quantity: 2,
      variant: '1g tin',
    }),
  }).then((r) => r.json());
  const addedItems = Array.isArray(rawAddToCart) ? rawAddToCart : (rawAddToCart.data || rawAddToCart.items || []);
  assert(Array.isArray(addedItems) && addedItems.length > 0, 'Cart contains active items in PostgreSQL');

  const rawCartCheck = await fetch(`${BASE_URL}/cart`, { headers: authHeaders }).then((r) => r.json());
  const cartItems = Array.isArray(rawCartCheck) ? rawCartCheck : (rawCartCheck.data || rawCartCheck.items || []);
  assert(cartItems.some((i) => i.productId === saffron.id || i.product === saffron.id || i.id === saffron.id), 'Cart persistence verified');

  // 8. Order Creation
  console.log('\nStep 8: Checkout & Order Creation');
  const orderPayload = {
    orderItems: [
      {
        product: saffron.id,
        name: saffron.name,
        qty: 2,
        price: saffron.price,
        image: saffron.image || '/images/saffron.jpg',
      },
    ],
    shippingAddress: {
      street: '14 Civil Lines',
      city: 'Srinagar',
      state: 'Jammu & Kashmir',
      postalCode: '190001',
      country: 'India',
      phone: '+91 9876543210',
    },
    paymentMethod: 'cod',
    itemsPrice: saffron.price * 2,
    taxPrice: 0,
    shippingPrice: 0,
    totalPrice: saffron.price * 2,
  };

  const createOrderRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(orderPayload),
  }).then((r) => r.json());

  const createdOrder = createOrderRes.data || createOrderRes;
  assert(createdOrder && createdOrder.id, `Order ID created: ${createdOrder.id}`);
  assert(createdOrder.totalPrice >= saffron.price * 2, `Order total includes items price plus GST: ₹${createdOrder.totalPrice}`);

  // Mark order delivered in PostgreSQL to verify Verified Buyer Review flow
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.order.update({
    where: { id: createdOrder.id },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
  console.log('  ✓ Order status updated to DELIVERED (Verified Buyer status granted)');

  // 9. Order Route Safety: Protected GET /orders/:id vs Public GET /orders/track/:id
  console.log('\nStep 9: Order Route Safety Verification');
  // Protected order detail
  const rawOrderDetail = await fetch(`${BASE_URL}/orders/${createdOrder.id}`, { headers: authHeaders }).then((r) => r.json());
  const orderDetail = rawOrderDetail.data || rawOrderDetail;
  assert(orderDetail.id === createdOrder.id, 'Protected GET /orders/:id loads authentic order details');

  // Public order tracking (must not be captured by :id)
  const rawTrack = await fetch(`${BASE_URL}/orders/track/${createdOrder.id}`).then((r) => r.json());
  const trackData = rawTrack.data || rawTrack;
  assert(trackData.orderId === createdOrder.id || trackData.id === createdOrder.id, 'Public tracking endpoint returns order status');

  // 10. Customer Order History
  console.log('\nStep 10: Customer Order History');
  const rawMyOrders = await fetch(`${BASE_URL}/orders/myorders`, { headers: authHeaders }).then((r) => r.json());
  const myOrders = Array.isArray(rawMyOrders) ? rawMyOrders : (rawMyOrders.data || []);
  assert(Array.isArray(myOrders) && myOrders.some((o) => o.id === createdOrder.id), 'Newly created order appears in customer history');

  // 11. Customer Product Review
  console.log('\nStep 11: Product Review Submission & Uniqueness');
  // Clean up any prior test review for this user & product for test idempotency
  await prisma.review.deleteMany({
    where: { productId: saffron.id, userId: customerUser.id },
  });

  const reviewPayload = {
    productId: saffron.id,
    rating: 5,
    title: 'Pure Kashmiri Heritage Quality',
    comment: 'Exceptional aroma and authentic deep crimson threads. Pure heritage quality.',
  };

  const rawReviewRes = await fetch(`${BASE_URL}/reviews`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(reviewPayload),
  }).then((r) => r.json());
  console.log('Review Response:', rawReviewRes);
  assert(rawReviewRes.review?.id || rawReviewRes.message === 'Review submitted successfully', 'Product review submitted and saved to PostgreSQL');

  const productReviewsRes = await fetch(`${BASE_URL}/reviews/product/${saffron.id}`).then((r) => r.json());
  const reviewsList = Array.isArray(productReviewsRes) ? productReviewsRes : (productReviewsRes.reviews || productReviewsRes.data || []);
  assert(Array.isArray(reviewsList) && reviewsList.length > 0, 'Product reviews retrieved from PostgreSQL');
  console.log(`  ✓ Retrieved ${reviewsList.length} reviews for saffron from PostgreSQL`);

  await prisma.$disconnect();

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  🎉 PHASE 12 E2E CRITICAL JOURNEY COMPLETE: ALL 11 STAGES PASS!');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

runJourney().catch((err) => {
  console.error('\nE2E Journey Error:', err);
  process.exit(1);
});
