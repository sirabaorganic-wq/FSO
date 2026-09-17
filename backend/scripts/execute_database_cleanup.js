/**
 * FSO Database Cleanup / Production Bootstrap Execution Script
 *
 * Requirements:
 * 1. Preserve all users where isAdmin === true (dynamic query, no hardcoded user counts).
 * 2. Use database predicates (isAdmin === false, all Products) as authoritative cleanup criteria.
 * 3. Atomic execution via prisma.$transaction.
 * 4. Comprehensive post-cleanup FK / dangling-reference integrity audit.
 * 5. Idempotent execution.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runCleanup() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   FSO NEON POSTGRESQL PRODUCTION BOOTSTRAP CLEANUP');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Pre-cleanup audit
  console.log('1. Auditing pre-cleanup state...');
  const preCounts = {
    usersTotal: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { isAdmin: true } }),
    nonAdminUsers: await prisma.user.count({ where: { isAdmin: false } }),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    vendors: await prisma.vendor.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    vendorOrders: await prisma.vendorOrder.count(),
    reviews: await prisma.review.count(),
    carts: await prisma.cart.count(),
    cartItems: await prisma.cartItem.count(),
    articles: await prisma.article.count(),
    recipes: await prisma.recipe.count(),
    ingredients: await prisma.ingredient.count(),
    collections: await prisma.collection.count(),
    banners: await prisma.banner.count(),
    articleProducts: await prisma.articleProduct.count(),
    recipeProducts: await prisma.recipeProduct.count(),
    collectionProducts: await prisma.collectionProduct.count(),
    productBatches: await prisma.productBatch.count(),
    productCompliance: await prisma.productCompliance.count(),
  };

  console.log('Pre-Cleanup Counts:');
  console.table(preCounts);

  // Verify at least one admin user exists
  const adminUsers = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true, name: true, role: true },
  });

  if (adminUsers.length === 0) {
    throw new Error('ABORTING: No User with isAdmin: true found in database. Cannot proceed safely.');
  }

  console.log(`Found ${adminUsers.length} admin user(s) to preserve:`, adminUsers.map(a => a.email).join(', '));
  const primaryAdminId = adminUsers[0].id;

  // Non-admin users targeted for deletion
  const nonAdminUsers = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true, email: true, role: true },
  });
  console.log(`Found ${nonAdminUsers.length} non-admin user(s) targeted for cleanup:`, nonAdminUsers.map(u => `${u.email} (${u.role})`).join(', '));

  // Products targeted for deletion
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, name: true },
  });
  console.log(`Found ${products.length} product(s) targeted for cleanup:`, products.map(p => p.slug).join(', '));

  // 2. Execute Transactional Cleanup
  console.log('\n2. Executing atomic transactional cleanup...');
  const transactionResult = await prisma.$transaction(async (tx) => {
    // Step A: Reassign content createdById to primary admin to preserve editorial content
    console.log('   [Step A] Reassigning editorial content createdById to admin user...');
    const updatedArticles = await tx.article.updateMany({
      where: { createdById: { in: nonAdminUsers.map(u => u.id) } },
      data: { createdById: primaryAdminId },
    });
    const updatedRecipes = await tx.recipe.updateMany({
      where: { createdById: { in: nonAdminUsers.map(u => u.id) } },
      data: { createdById: primaryAdminId },
    });
    const updatedIngredients = await tx.ingredient.updateMany({
      where: { createdById: { in: nonAdminUsers.map(u => u.id) } },
      data: { createdById: primaryAdminId },
    });
    const updatedCollections = await tx.collection.updateMany({
      where: { createdById: { in: nonAdminUsers.map(u => u.id) } },
      data: { createdById: primaryAdminId },
    });
    const updatedBanners = await tx.banner.updateMany({
      where: { createdById: { in: nonAdminUsers.map(u => u.id) } },
      data: { createdById: primaryAdminId },
    });
    console.log(`   - Reassigned: ${updatedArticles.count} articles, ${updatedRecipes.count} recipes, ${updatedIngredients.count} ingredients, ${updatedCollections.count} collections, ${updatedBanners.count} banners.`);

    // Also nullify any vendor approval/verification fields referencing non-admin users if any
    await tx.vendor.updateMany({
      where: {
        OR: [
          { approvedById: { in: nonAdminUsers.map(u => u.id) } },
          { subadminApprovedById: { in: nonAdminUsers.map(u => u.id) } },
          { verifiedById: { in: nonAdminUsers.map(u => u.id) } },
        ],
      },
      data: {
        approvedById: null,
        subadminApprovedById: null,
        verifiedById: null,
      },
    });

    // Step B: Delete Reviews
    console.log('   [Step B] Deleting reviews...');
    const deletedReviews = await tx.review.deleteMany({
      where: {
        OR: [
          { userId: { in: nonAdminUsers.map(u => u.id) } },
          { productId: { in: products.map(p => p.id) } },
        ],
      },
    });
    console.log(`   - Deleted ${deletedReviews.count} review(s).`);

    // Step C: Delete Orders & dependent OrderItems / VendorOrders / Payments
    console.log('   [Step C] Deleting demo orders...');
    // Delete payments first if not cascading
    await tx.payment.deleteMany({
      where: {
        order: {
          OR: [
            { userId: { in: nonAdminUsers.map(u => u.id) } },
            { orderItems: { some: { productId: { in: products.map(p => p.id) } } } },
          ],
        },
      },
    });
    // Delete refunds if any
    await tx.refundLog.deleteMany({
      where: {
        order: {
          OR: [
            { userId: { in: nonAdminUsers.map(u => u.id) } },
            { orderItems: { some: { productId: { in: products.map(p => p.id) } } } },
          ],
        },
      },
    });
    // Delete vendor orders
    const deletedVendorOrders = await tx.vendorOrder.deleteMany({
      where: {
        order: {
          OR: [
            { userId: { in: nonAdminUsers.map(u => u.id) } },
            { orderItems: { some: { productId: { in: products.map(p => p.id) } } } },
          ],
        },
      },
    });
    // Delete order items
    const deletedOrderItems = await tx.orderItem.deleteMany({
      where: {
        OR: [
          { productId: { in: products.map(p => p.id) } },
          { order: { userId: { in: nonAdminUsers.map(u => u.id) } } },
        ],
      },
    });
    // Delete orders
    const deletedOrders = await tx.order.deleteMany({
      where: {
        OR: [
          { userId: { in: nonAdminUsers.map(u => u.id) } },
          { user: { isAdmin: false } },
        ],
      },
    });
    console.log(`   - Deleted ${deletedOrders.count} order(s), ${deletedOrderItems.count} order item(s), ${deletedVendorOrders.count} vendor order(s).`);

    // Step D: Delete Carts & CartItems
    console.log('   [Step D] Deleting demo carts...');
    const deletedCartItems = await tx.cartItem.deleteMany({
      where: {
        OR: [
          { productId: { in: products.map(p => p.id) } },
          { cart: { userId: { in: nonAdminUsers.map(u => u.id) } } },
        ],
      },
    });
    const deletedCarts = await tx.cart.deleteMany({
      where: {
        userId: { in: nonAdminUsers.map(u => u.id) },
      },
    });
    console.log(`   - Deleted ${deletedCarts.count} cart(s), ${deletedCartItems.count} cart item(s).`);

    // Step E: Delete Product Junctions & Dependent Models
    console.log('   [Step E] Deleting product junctions & compliance...');
    const deletedArticleProducts = await tx.articleProduct.deleteMany({
      where: { productId: { in: products.map(p => p.id) } },
    });
    const deletedRecipeProducts = await tx.recipeProduct.deleteMany({
      where: { productId: { in: products.map(p => p.id) } },
    });
    const deletedCollectionProducts = await tx.collectionProduct.deleteMany({
      where: { productId: { in: products.map(p => p.id) } },
    });
    const deletedIngredientProducts = await tx.ingredientProduct.deleteMany({
      where: { productId: { in: products.map(p => p.id) } },
    });
    const deletedBatches = await tx.productBatch.deleteMany({
      where: { productId: { in: products.map(p => p.id) } },
    });
    const deletedCompliance = await tx.productCompliance.deleteMany({
      where: { productId: { in: products.map(p => p.id) } },
    });
    console.log(`   - Deleted ${deletedArticleProducts.count} article-product, ${deletedRecipeProducts.count} recipe-product, ${deletedCollectionProducts.count} collection-product links.`);

    // Step F: Delete all Products
    console.log('   [Step F] Deleting all Product records...');
    const deletedProducts = await tx.product.deleteMany({});
    console.log(`   - Deleted ${deletedProducts.count} product(s).`);

    // Step G: Delete notifications of non-admin users
    await tx.notification.deleteMany({
      where: { userId: { in: nonAdminUsers.map(u => u.id) } },
    });

    // Step H: Delete Vendor Admin Notes & Badges added by non-admin users
    await tx.vendorAdminNote.deleteMany({
      where: { addedById: { in: nonAdminUsers.map(u => u.id) } },
    });
    await tx.vendorVerificationBadge.deleteMany({
      where: { verifiedById: { in: nonAdminUsers.map(u => u.id) } },
    });

    // Step I: Delete non-admin Users using authoritative predicate { isAdmin: false }
    console.log('   [Step I] Deleting non-admin users with predicate { isAdmin: false }...');
    const deletedUsers = await tx.user.deleteMany({
      where: { isAdmin: false },
    });
    console.log(`   - Deleted ${deletedUsers.count} non-admin user(s).`);

    return {
      deletedUsersCount: deletedUsers.count,
      deletedProductsCount: deletedProducts.count,
      deletedOrdersCount: deletedOrders.count,
      deletedOrderItemsCount: deletedOrderItems.count,
      deletedReviewsCount: deletedReviews.count,
      deletedCartsCount: deletedCarts.count,
    };
  }, {
    maxWait: 20000,
    timeout: 60000,
  });

  console.log('\nTransaction committed successfully!');
  console.log(transactionResult);

  // 3. Post-cleanup FK / Dangling-reference Integrity Audit
  console.log('\n3. Running Post-Cleanup FK & Dangling-Reference Integrity Audit...');

  const postCounts = {
    usersTotal: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { isAdmin: true } }),
    nonAdminUsers: await prisma.user.count({ where: { isAdmin: false } }),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    vendors: await prisma.vendor.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    vendorOrders: await prisma.vendorOrder.count(),
    reviews: await prisma.review.count(),
    carts: await prisma.cart.count(),
    cartItems: await prisma.cartItem.count(),
    articles: await prisma.article.count(),
    recipes: await prisma.recipe.count(),
    ingredients: await prisma.ingredient.count(),
    collections: await prisma.collection.count(),
    banners: await prisma.banner.count(),
    articleProducts: await prisma.articleProduct.count(),
    recipeProducts: await prisma.recipeProduct.count(),
    collectionProducts: await prisma.collectionProduct.count(),
    productBatches: await prisma.productBatch.count(),
    productCompliance: await prisma.productCompliance.count(),
  };

  console.log('Post-Cleanup Counts:');
  console.table(postCounts);

  // Assertions
  const assertions = [
    {
      check: 'Non-admin users count === 0',
      pass: postCounts.nonAdminUsers === 0,
      actual: postCounts.nonAdminUsers,
    },
    {
      check: 'Admin users count preserved (=== pre-cleanup admin count)',
      pass: postCounts.adminUsers === preCounts.adminUsers,
      actual: postCounts.adminUsers,
    },
    {
      check: 'Product count === 0',
      pass: postCounts.products === 0,
      actual: postCounts.products,
    },
    {
      check: 'OrderItem count === 0',
      pass: postCounts.orderItems === 0,
      actual: postCounts.orderItems,
    },
    {
      check: 'Order count === 0',
      pass: postCounts.orders === 0,
      actual: postCounts.orders,
    },
    {
      check: 'Review count === 0',
      pass: postCounts.reviews === 0,
      actual: postCounts.reviews,
    },
    {
      check: 'Vendors count preserved',
      pass: postCounts.vendors === preCounts.vendors,
      actual: postCounts.vendors,
    },
    {
      check: 'Categories count preserved (5)',
      pass: postCounts.categories === 5,
      actual: postCounts.categories,
    },
    {
      check: 'Editorial Articles preserved',
      pass: postCounts.articles === preCounts.articles,
      actual: postCounts.articles,
    },
    {
      check: 'Editorial Recipes preserved',
      pass: postCounts.recipes === preCounts.recipes,
      actual: postCounts.recipes,
    },
    {
      check: 'Botanical Ingredients preserved',
      pass: postCounts.ingredients === preCounts.ingredients,
      actual: postCounts.ingredients,
    },
    {
      check: 'Editorial Collections preserved',
      pass: postCounts.collections === preCounts.collections,
      actual: postCounts.collections,
    },
    {
      check: 'Banners preserved',
      pass: postCounts.banners === preCounts.banners,
      actual: postCounts.banners,
    },
  ];

  console.log('\nIntegrity Assertions:');
  console.table(assertions);

  const failedAssertions = assertions.filter(a => !a.pass);
  if (failedAssertions.length > 0) {
    throw new Error(`Integrity audit failed: ${JSON.stringify(failedAssertions)}`);
  }

  // Check dangling foreign keys in content models
  console.log('\nAuditing content createdById foreign key references...');
  const remainingUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);

  const articlesWithCreatedBy = await prisma.article.findMany({ select: { id: true, slug: true, createdById: true } });
  for (const art of articlesWithCreatedBy) {
    if (art.createdById && !remainingUserIds.includes(art.createdById)) {
      throw new Error(`Dangling createdById on Article ${art.slug}: ${art.createdById}`);
    }
  }

  const recipesWithCreatedBy = await prisma.recipe.findMany({ select: { id: true, slug: true, createdById: true } });
  for (const rec of recipesWithCreatedBy) {
    if (rec.createdById && !remainingUserIds.includes(rec.createdById)) {
      throw new Error(`Dangling createdById on Recipe ${rec.slug}: ${rec.createdById}`);
    }
  }

  const ingredientsWithCreatedBy = await prisma.ingredient.findMany({ select: { id: true, slug: true, createdById: true } });
  for (const ing of ingredientsWithCreatedBy) {
    if (ing.createdById && !remainingUserIds.includes(ing.createdById)) {
      throw new Error(`Dangling createdById on Ingredient ${ing.slug}: ${ing.createdById}`);
    }
  }

  const collectionsWithCreatedBy = await prisma.collection.findMany({ select: { id: true, slug: true, createdById: true } });
  for (const col of collectionsWithCreatedBy) {
    if (col.createdById && !remainingUserIds.includes(col.createdById)) {
      throw new Error(`Dangling createdById on Collection ${col.slug}: ${col.createdById}`);
    }
  }

  const bannersWithCreatedBy = await prisma.banner.findMany({ select: { id: true, title: true, createdById: true } });
  for (const ban of bannersWithCreatedBy) {
    if (ban.createdById && !remainingUserIds.includes(ban.createdById)) {
      throw new Error(`Dangling createdById on Banner ${ban.title}: ${ban.createdById}`);
    }
  }

  console.log('✅ Zero dangling foreign keys found across all content tables.');
  console.log('✅ Integrity Audit 100% Passed!');

  await prisma.$disconnect();

  return { preCounts, postCounts, assertions };
}

runCleanup()
  .then(() => {
    console.log('\nDatabase cleanup finished cleanly.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Database cleanup failed:', err);
    process.exit(1);
  });
