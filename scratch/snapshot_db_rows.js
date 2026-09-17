const path = require('path');
const crypto = require('crypto');
let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (e) {
  PrismaClient = require(path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client')).PrismaClient;
}
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    const vendors = await prisma.vendor.findMany({ orderBy: { id: 'asc' } });
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    const orders = await prisma.order.findMany({ orderBy: { id: 'asc' } });
    const payments = await prisma.payment.findMany({ orderBy: { id: 'asc' } });
    const carts = await prisma.cart.findMany({ orderBy: { id: 'asc' } });
    const cartItems = await prisma.cartItem.findMany({ orderBy: { id: 'asc' } });
    const reviews = await prisma.review.findMany({ orderBy: { id: 'asc' } });

    const snapshot = {
      users: users.map(u => ({ id: u.id, email: u.email, role: u.role, updatedAt: u.updatedAt })),
      vendors: vendors.map(v => ({ id: v.id, slug: v.slug, email: v.email, businessName: v.businessName, updatedAt: v.updatedAt })),
      productsCount: products.length,
      ordersCount: orders.length,
      carts: carts.map(c => ({ id: c.id, userId: c.userId, updatedAt: c.updatedAt })),
    };

    const hash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');

    console.log('=== ROW-LEVEL FORENSIC SNAPSHOT ===');
    console.log(`Users: ${users.length}`);
    console.log(`Vendors: ${vendors.length}`);
    console.log(`Products: ${products.length}`);
    console.log(`Orders: ${orders.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log(`Carts: ${carts.length}`);
    console.log(`CartItems: ${cartItems.length}`);
    console.log(`Reviews: ${reviews.length}`);
    console.log('SNAPSHOT_HASH:', hash);
  } catch (err) {
    console.error('Snapshot error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
