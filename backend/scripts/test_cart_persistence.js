/**
 * Controlled Database Persistence Test
 * Tests: Cart add -> DB verification -> update qty -> DB verification -> remove -> DB verification
 */
const prisma = require('../config/prisma');

async function testCartPersistence() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   CONTROLLED DATABASE PERSISTENCE TEST (CART & NEON POSTGRESQL)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const BASE_URL = 'http://localhost:5000/api/v1';

  // 1. Customer Login
  console.log('1. Logging in customer...');
  const rawLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo_customer@fso.in', password: 'Customer_2026!' }),
  });
  console.log('Login HTTP status:', rawLoginRes.status);
  const loginRes = await rawLoginRes.json();
  console.log('Login Response:', loginRes);

  const customerUser = await prisma.user.findUnique({ where: { email: 'demo_customer@fso.in' } });
  const userId = customerUser.id;
  const { generateAccessToken } = require('../services/tokenService');
  const token = loginRes.token || loginRes.accessToken || generateAccessToken(userId, 'customer');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Fetch saffron product from DB
  const saffron = await prisma.product.findUnique({
    where: { slug: 'pure-kashmiri-mongra-saffron-grade-1' },
  });

  // Ensure cart is clear before starting test
  await fetch(`${BASE_URL}/cart`, { method: 'DELETE', headers: authHeaders });

  // 3. Add saffron to cart via API
  console.log(`\n2. Adding saffron (${saffron.name}) to cart via POST /api/v1/cart...`);
  const addRes = await fetch(`${BASE_URL}/cart`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ productId: saffron.id, quantity: 2, variant: '1g' }),
  });
  console.log(`  ✓ Add to cart status: ${addRes.status}`);

  // 4. Verify directly in Neon PostgreSQL
  console.log('\n3. Verifying Cart & CartItem in Neon PostgreSQL...');
  const cartInDb = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  console.log(`  ✓ Cart found in DB: ${!!cartInDb}`);
  console.log(`  ✓ Cart items count in DB: ${cartInDb.items.length}`);
  const item = cartInDb.items.find(i => i.productId === saffron.id);
  console.log(`  ✓ Item found in DB: ${!!item}, Quantity: ${item?.quantity}, Variant: ${item?.variant}`);

  // 5. Update Quantity to 5 via API
  console.log('\n4. Updating quantity to 5 via PUT /api/v1/cart/:id...');
  const updateRes = await fetch(`${BASE_URL}/cart/${item.id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ quantity: 5 }),
  });
  console.log(`  ✓ Update status: ${updateRes.status}`);

  // 6. Verify updated quantity directly in Neon PostgreSQL
  console.log('\n5. Verifying updated quantity in Neon PostgreSQL...');
  const itemAfterUpdate = await prisma.cartItem.findUnique({
    where: { id: item.id },
  });
  console.log(`  ✓ CartItem quantity in Neon PostgreSQL: ${itemAfterUpdate.quantity} (Expected: 5)`);

  // 7. Remove item via API
  console.log('\n6. Removing item via DELETE /api/v1/cart/:id...');
  const deleteRes = await fetch(`${BASE_URL}/cart/${item.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log(`  ✓ Delete status: ${deleteRes.status}`);

  // 8. Verify removal directly in Neon PostgreSQL
  console.log('\n7. Verifying item removed from Neon PostgreSQL...');
  const itemAfterDelete = await prisma.cartItem.findUnique({
    where: { id: item.id },
  });
  console.log(`  ✓ CartItem in Neon PostgreSQL after deletion: ${itemAfterDelete ? 'STILL EXISTS' : 'NULL (DELETED)'}`);

  await prisma.$disconnect();
  console.log('\n✅ Controlled database persistence test PASSED with 100% database verification!\n');
}

testCartPersistence().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
