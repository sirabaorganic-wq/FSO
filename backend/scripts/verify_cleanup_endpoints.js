const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- 1. Testing GET /api/v1/products ---');
  const prods = await get('/api/v1/products');
  console.log('Status:', prods.status);
  console.log('Products Count:', Array.isArray(prods.body) ? prods.body.length : (prods.body?.data?.length ?? prods.body));

  console.log('\n--- 2. Testing GET /api/v1/producers ---');
  const producers = await get('/api/v1/producers');
  console.log('Status:', producers.status);
  console.log('Producers Count:', producers.body?.data?.length);

  console.log('\n--- 3. Testing GET /api/v1/products/categories ---');
  const cats = await get('/api/v1/products/categories');
  console.log('Status:', cats.status);
  console.log('Categories Count:', Array.isArray(cats.body) ? cats.body.length : cats.body);
  console.log('Categories:', cats.body);

  console.log('\n--- 4. Testing GET /api/v1/articles ---');
  const articles = await get('/api/v1/articles');
  console.log('Status:', articles.status);
  console.log('Articles Count:', articles.body?.data?.length);

  console.log('\n--- 5. Testing GET /api/v1/collections ---');
  const cols = await get('/api/v1/collections');
  console.log('Status:', cols.status);
  console.log('Collections Count:', cols.body?.data?.length);
}

verify().catch(console.error);
