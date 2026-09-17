const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('--- USERS ---');
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, email: u.email, role: u.role, isAdmin: u.isAdmin })));

  console.log('\n--- ORDERS & USERS ---');
  const orders = await prisma.order.findMany({
    include: { orderItems: true, vendorOrders: true, payments: true, refunds: true }
  });
  console.log(orders.map(o => ({
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    status: o.status,
    itemsCount: o.orderItems.length,
    productIds: o.orderItems.map(i => i.productId)
  })));

  console.log('\n--- PRODUCTS & RELATIONS ---');
  const products = await prisma.product.findMany({
    include: {
      orderItems: true,
      reviews: true,
      productCompliance: true,
      productBatches: true,
      articleLinks: true,
      recipeLinks: true,
      ingredientLinks: true,
      collectionLinks: true,
    }
  });
  console.log(products.map(p => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    orderItemsCount: p.orderItems.length,
    reviewsCount: p.reviews.length,
    batchesCount: p.productBatches.length,
    compliance: Boolean(p.productCompliance),
    articleLinksCount: p.articleLinks.length,
    recipeLinksCount: p.recipeLinks.length,
    ingredientLinksCount: p.ingredientLinks.length,
    collectionLinksCount: p.collectionLinks.length,
  })));

  console.log('\n--- REVIEWS ---');
  const reviews = await prisma.review.findMany();
  console.log(reviews.map(r => ({ id: r.id, productId: r.productId, userId: r.userId })));

  console.log('\n--- CARTS & CART ITEMS ---');
  const carts = await prisma.cart.findMany({ include: { items: true } });
  console.log(carts.map(c => ({ id: c.id, userId: c.userId, itemsCount: c.items.length })));

  console.log('\n--- CONTENT AUTHORSHIP (createdById) ---');
  const articles = await prisma.article.findMany({ select: { id: true, title: true, createdById: true } });
  const recipes = await prisma.recipe.findMany({ select: { id: true, title: true, createdById: true } });
  const ingredients = await prisma.ingredient.findMany({ select: { id: true, name: true, createdById: true } });
  const collections = await prisma.collection.findMany({ select: { id: true, title: true, createdById: true } });
  const banners = await prisma.banner.findMany({ select: { id: true, title: true, createdById: true } });
  console.log('Articles:', articles);
  console.log('Recipes:', recipes);
  console.log('Ingredients:', ingredients);
  console.log('Collections:', collections);
  console.log('Banners:', banners);

  console.log('\n--- VENDOR RELATIONS TO USERS ---');
  const vendors = await prisma.vendor.findMany({
    select: {
      id: true,
      businessName: true,
      approvedById: true,
      subadminApprovedById: true,
      verifiedById: true,
    }
  });
  console.log(vendors);

  console.log('\n--- VENDOR ADMIN NOTES & BADGES ---');
  const adminNotes = await prisma.vendorAdminNote.findMany();
  const badges = await prisma.vendorVerificationBadge.findMany();
  console.log('AdminNotes:', adminNotes);
  console.log('Badges:', badges);

  await prisma.$disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
