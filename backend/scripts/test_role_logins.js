/**
 * Test Role Authentication & Dashboard Authorization Script
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

async function testAuth() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   TESTING ROLE AUTHENTICATION & ACCESS IN NEON POSTGRESQL');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const BASE_URL = 'http://localhost:5000/api/v1';

  // 1. Customer Login Test
  console.log('--- 1. Customer Account (demo_customer@fso.in) ---');
  try {
    const custRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo_customer@fso.in', password: 'Customer_2026!' }),
    });
    const custData = await custRes.json();
    console.log(`Status: ${custRes.status}`);
    console.log(`Role returned: ${custData.role}`);
    console.log(`isAdmin: ${custData.isAdmin}`);
    console.log(`Token issued: ${!!custData.token}`);

    // Verify customer cannot access admin route
    const adminCheck = await fetch(`${BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${custData.token}` },
    });
    console.log(`Customer access to /api/v1/auth/users: ${adminCheck.status} (Expected 403 Forbidden)`);
  } catch (err) {
    console.error('Customer login error:', err.message);
  }

  // 2. Editor Login Test
  console.log('\n--- 2. Content Editor Account (editor@fso.in) ---');
  try {
    const editRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'editor@fso.in', password: 'FSO_Editor_2026!' }),
    });
    const editData = await editRes.json();
    console.log(`Status: ${editRes.status}`);
    console.log(`Role returned: ${editData.role}`);
    console.log(`isAdmin: ${editData.isAdmin}`);
    console.log(`Token issued: ${!!editData.token}`);

    // Verify editor cannot access admin route
    const adminCheck = await fetch(`${BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${editData.token}` },
    });
    console.log(`Editor access to /api/v1/auth/users: ${adminCheck.status} (Expected 403 Forbidden)`);
  } catch (err) {
    console.error('Editor login error:', err.message);
  }

  // 3. Admin Login Test
  console.log('\n--- 3. Administrator Account (admin@fso.in) ---');
  try {
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fso.in', password: 'FSO_Admin_2026!' }),
    });
    const adminData = await adminRes.json();
    console.log(`Status: ${adminRes.status}`);
    console.log(`Role returned: ${adminData.role}`);
    console.log(`isAdmin: ${adminData.isAdmin}`);
    console.log(`Token issued: ${!!adminData.token}`);

    // Verify admin access to admin route
    const adminCheck = await fetch(`${BASE_URL}/auth/users`, {
      headers: { Authorization: `Bearer ${adminData.token}` },
    });
    console.log(`Admin access to /api/v1/auth/users: ${adminCheck.status} (Expected 200)`);
    if (adminCheck.status === 200) {
      const usersList = await adminCheck.json();
      console.log(`Admin successfully fetched ${usersList.length} users from Neon.`);
    }
  } catch (err) {
    console.error('Admin login error:', err.message);
  }

  // 4. Producer / Vendor Check
  console.log('\n--- 4. Producer / Vendor Account Check ---');
  const producers = await prisma.vendor.findMany({
    select: { id: true, businessName: true, email: true, status: true, isActive: true },
  });
  console.log('Producers in DB:', producers);

  await prisma.$disconnect();
}

testAuth().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
