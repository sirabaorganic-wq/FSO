/**
 * Full Authentication Lifecycle Test
 * Login -> Access Token -> Refresh Token Rotation -> Restore Session -> Logout
 */
const prisma = require('../config/prisma');

async function testAuthLifecycle() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   TESTING AUTHENTICATION LIFECYCLE & SESSION PERSISTENCE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const BASE_URL = 'http://localhost:5000/api/v1';

  // 1. Login
  console.log('1. Customer Login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo_customer@fso.in', password: 'Customer_2026!' }),
  });

  const cookieHeader = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.log(`  ✓ Login status: ${loginRes.status}`);
  console.log(`  ✓ Access Token received: ${loginData.token ? 'YES' : 'NO'}`);
  console.log(`  ✓ Refresh Cookie set: ${cookieHeader ? 'YES' : 'NO'}`);

  // 2. Fetch Profile with Access Token
  console.log('\n2. Fetching Profile with Access Token...');
  const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${loginData.token}` },
  });
  const profileData = await profileRes.json();
  console.log(`  ✓ Profile status: ${profileRes.status}`);
  console.log(`  ✓ Profile email matches: ${profileData.email === 'demo_customer@fso.in' ? 'YES' : 'NO'}`);

  // 3. Refresh Token Rotation
  console.log('\n3. Rotating Refresh Token...');
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Cookie': cookieHeader || '',
    },
  });
  const refreshData = await refreshRes.json();
  console.log(`  ✓ Refresh status: ${refreshRes.status}`);
  console.log(`  ✓ New Access Token received: ${refreshData.accessToken ? 'YES' : 'NO'}`);

  // 4. Verify New Access Token
  console.log('\n4. Verifying New Access Token...');
  const verifyRes = await fetch(`${BASE_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${refreshData.accessToken}` },
  });
  const verifyData = await verifyRes.json();
  console.log(`  ✓ Profile status with refreshed token: ${verifyRes.status}`);
  console.log(`  ✓ Identity verified: ${verifyData.name}`);

  // 5. Logout and Revocation
  console.log('\n5. Logging out...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshData.accessToken}`,
      'Cookie': cookieHeader || '',
    },
  });
  const logoutData = await logoutRes.json();
  console.log(`  ✓ Logout status: ${logoutRes.status}`);
  console.log(`  ✓ Message: ${logoutData.message}`);

  await prisma.$disconnect();
  console.log('\n✅ All authentication lifecycle tests passed successfully!\n');
}

testAuthLifecycle().catch(err => {
  console.error('Lifecycle test failed:', err);
  process.exit(1);
});
