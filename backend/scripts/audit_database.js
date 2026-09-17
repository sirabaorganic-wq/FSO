/**
 * FSO Database Data Audit Script
 * Read-only inspection of Neon PostgreSQL database models and record counts.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   FSO NEON POSTGRESQL COMPLETE DATABASE AUDIT');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Audit Users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isAdmin: true,
      isBlocked: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('--- 1. USERS & ROLES ---');
  console.log(`Total Users Found: ${users.length}`);
  console.table(users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isAdmin: u.isAdmin,
    isBlocked: u.isBlocked,
    isEmailVerified: u.isEmailVerified,
  })));

  // 2. Audit Producers / Vendors
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      businessName: true,
      email: true,
      status: true,
      isActive: true,
      producerType: true,
      businessType: true,
      village: true,
      region: true,
      addressState: true,
      createdAt: true,
      _count: { select: { products: true, vendorOrders: true } },
    },
  });

  console.log('\n--- 2. PRODUCERS / VENDORS ---');
  console.log(`Total Producers/Vendors Found: ${vendors.length}`);
  console.table(vendors.map(v => ({
    id: v.id,
    businessName: v.businessName,
    email: v.email,
    status: v.status,
    isActive: v.isActive,
    producerType: v.producerType,
    region: v.region,
    productCount: v._count.products,
  })));

  // 3. Audit Products
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stockQuantity: true,
      category: true,
      vendorId: true,
      vendor: { select: { businessName: true } },
      isPublic: true,
      isActive: true,
      originState: true,
      originRegion: true,
      processingMethod: true,
      harvestSeason: true,
      rating: true,
      numReviews: true,
    },
  });

  console.log('\n--- 3. PRODUCTS ---');
  console.log(`Total Products Found: ${products.length}`);
  console.table(products.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    stock: p.stockQuantity,
    category: p.category,
    producer: p.vendor?.businessName,
    isPublic: p.isPublic,
    isActive: p.isActive,
    rating: p.rating,
    numReviews: p.numReviews,
  })));

  // 4. Audit Categories
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  console.log('\n--- 4. CATEGORIES ---');
  console.log(`Total Categories Found: ${categories.length}`);
  console.table(categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    isActive: c.isActive,
    productCount: c._count.products,
  })));

  // 5. Complete Inventory Counts across all tables
  const counts = {
    users: await prisma.user.count(),
    otps: await prisma.oTP.count(),
    vendors: await prisma.vendor.count(),
    vendorAdminNotes: await prisma.vendorAdminNote.count(),
    vendorVerificationBadges: await prisma.vendorVerificationBadge.count(),
    products: await prisma.product.count(),
    productBatches: await prisma.productBatch.count(),
    categories: await prisma.category.count(),
    carts: await prisma.cart.count(),
    cartItems: await prisma.cartItem.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    vendorOrders: await prisma.vendorOrder.count(),
    payments: await prisma.payment.count(),
    refundLogs: await prisma.refundLog.count(),
    webhookLogs: await prisma.webhookLog.count(),
    coupons: await prisma.coupon.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    articles: await prisma.article.count(),
    recipes: await prisma.recipe.count(),
    ingredients: await prisma.ingredient.count(),
    collections: await prisma.collection.count(),
    banners: await prisma.banner.count(),
    inquiries: await prisma.inquiry.count(),
    contactSubmissions: await prisma.contactSubmission.count(),
  };

  console.log('\n--- 5. FULL ENTITY RECORD COUNTS ---');
  console.table(Object.entries(counts).map(([entity, count]) => ({ entity, count })));

  // 6. Inspect Content (Articles, Recipes, Ingredients, Collections, Banners)
  const articles = await prisma.article.findMany({ select: { id: true, title: true, slug: true, category: true, published: true } });
  const recipes = await prisma.recipe.findMany({ select: { id: true, title: true, slug: true, region: true, difficulty: true, published: true } });
  const ingredients = await prisma.ingredient.findMany({ select: { id: true, name: true, slug: true, botanicalName: true, origin: true } });
  const collections = await prisma.collection.findMany({ select: { id: true, title: true, slug: true, category: true, isPublished: true } });
  const banners = await prisma.banner.findMany({ select: { id: true, title: true, position: true, isActive: true } });

  console.log('\n--- 6. CONTENT INVENTORY ---');
  console.log('Articles:', articles);
  console.log('Recipes:', recipes);
  console.log('Ingredients:', ingredients);
  console.log('Collections:', collections);
  console.log('Banners:', banners);

  // 7. Inspect Commerce Records (Orders, Reviews)
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      totalPrice: true,
      subtotal: true,
      taxPrice: true,
      paymentMethod: true,
      paymentStatus: true,
      createdAt: true,
      _count: { select: { orderItems: true, vendorOrders: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const reviews = await prisma.review.findMany({
    select: {
      id: true,
      productId: true,
      userId: true,
      rating: true,
      title: true,
      isVerifiedPurchase: true,
      isApproved: true,
      createdAt: true,
    },
  });

  console.log('\n--- 7. COMMERCE INVENTORY ---');
  console.log('Orders (latest up to 10):');
  console.table(orders.map(o => ({
    id: o.id,
    userId: o.userId,
    status: o.status,
    totalPrice: o.totalPrice,
    itemsCount: o._count.orderItems,
    vendorOrdersCount: o._count.vendorOrders,
  })));

  console.log('Reviews:');
  console.table(reviews);

  await prisma.$disconnect();
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
