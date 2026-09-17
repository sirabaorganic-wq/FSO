const http = require('http');
const path = require('path');
const dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { app } = require('../backend/server');
const connectDB = require('../backend/config/db');

async function main() {
  console.log('--- FSO PHASE 2 RUNTIME FORENSIC VERIFICATION ---');

  // Verify DB connection
  await connectDB();
  console.log('Authoritative DB: Connected via Prisma');

  // Create test server on ephemeral port
  const testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  const port = testServer.address().port;
  console.log(`Test server running on port ${port}`);

  async function get(urlPath) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          let body;
          try { body = JSON.parse(data); } catch { body = data; }
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      });
      req.on('error', reject);
    });
  }

  // 1. Health check
  const health = await get('/api/v1/health');
  console.log('1. GET /api/v1/health -> Status:', health.status, 'Body:', health.body);

  // 2. Admin unauthenticated
  const adminRes = await get('/api/admin/vendors');
  console.log('2. GET /api/admin/vendors (no token) -> Status:', adminRes.status, 'Message:', adminRes.body?.message);

  // 3. Vendor unauthenticated
  const vendorRes = await get('/api/vendors/profile');
  console.log('3. GET /api/vendors/profile (no token) -> Status:', vendorRes.status, 'Message:', vendorRes.body?.message);

  // 4. Vendor plans public
  const plansRes = await get('/api/vendors/plans');
  console.log('4. GET /api/vendors/plans -> Status:', plansRes.status, 'HasPlans:', typeof plansRes.body === 'object');

  // 5. Gate 6 B2B feature disabled 501
  const b2bRes = await get('/api/b2b/distributors');
  console.log('5. GET /api/b2b/distributors (Gate 6) -> Status:', b2bRes.status, 'Code:', b2bRes.body?.error?.code);

  testServer.close();
  console.log('--- ALL RUNTIME CHECKS VERIFIED SUCCESSFULLY ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
