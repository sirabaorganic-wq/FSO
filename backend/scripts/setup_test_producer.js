/**
 * Safe Test Account Setup for Producer / Vendor
 * Creates exactly ONE development test account if missing.
 */
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

async function setupTestProducer() {
  console.log('--- Setting up FSO Test Producer ---');

  const email = 'producer@fso.in';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`User ${email} already exists with role ${existing.role}. No creation needed.`);
    return;
  }

  // Find existing approved producer
  const vendor = await prisma.vendor.findFirst({
    where: { businessName: 'Pahadi Amrut Forest Collective' },
  });

  const devPassword = process.env.TEST_PRODUCER_PASSWORD || process.env.DEV_PASSWORD || 'DevProducer_2026!';
  const passwordHash = await bcrypt.hash(devPassword, 10);

  const newUser = await prisma.user.create({
    data: {
      name: 'FSO Test Producer',
      email,
      password: passwordHash,
      phone: '+91 9876543213',
      role: 'PRODUCER_MANAGER',
      isAdmin: false,
      isEmailVerified: true,
      isPhoneVerified: true,
      businessName: vendor ? vendor.businessName : 'Pahadi Amrut Forest Collective',
    },
  });

  console.log(`✓ Created test producer account: ${newUser.email} (Role: ${newUser.role}, ID: ${newUser.id})`);

  // Test login with this account
  const BASE_URL = 'http://localhost:5000/api/v1';
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: devPassword }),
  });

  const loginData = await loginRes.json();
  console.log(`Login test status: ${loginRes.status}`);
  console.log(`Role returned: ${loginData.role}`);
  console.log(`Token issued: ${!!loginData.token}`);

  await prisma.$disconnect();
}

setupTestProducer().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
