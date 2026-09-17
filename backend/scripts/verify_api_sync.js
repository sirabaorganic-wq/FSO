/**
 * Complete API Synchronization Audit
 * Verifies DATABASE -> BACKEND API -> DATA FLOW
 */
const prisma = require('../config/prisma');

async function verifyApiSync() {
  const BASE_URL = 'http://localhost:5000/api/v1';

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('   DATABASE -> API -> FRONTEND SYNCHRONIZATION AUDIT');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // 1. Products
  const dbProducts = await prisma.product.count();
  const apiProductsRes = await fetch(`${BASE_URL}/products`).then(r => r.json());
  const apiProducts = Array.isArray(apiProductsRes) ? apiProductsRes : (apiProductsRes.data || []);
  console.log(`1. Products: DB=${dbProducts} | API=${apiProducts.length} | Match: ${dbProducts === apiProducts.length}`);

  // 2. Categories
  const dbCategories = await prisma.category.count();
  const apiCategoriesRes = await fetch(`${BASE_URL}/products/categories`).then(r => r.json());
  const apiCategories = Array.isArray(apiCategoriesRes) ? apiCategoriesRes : (apiCategoriesRes.data || []);
  console.log(`2. Categories: DB=${dbCategories} | API=${apiCategories.length} | Match: ${dbCategories === apiCategories.length}`);

  // 3. Producers
  const dbProducers = await prisma.vendor.count();
  const apiProducersRes = await fetch(`${BASE_URL}/producers`).then(r => r.json());
  const apiProducers = Array.isArray(apiProducersRes) ? apiProducersRes : (apiProducersRes.data || []);
  console.log(`3. Producers: DB=${dbProducers} | API=${apiProducers.length} | Match: ${dbProducers === apiProducers.length}`);

  // 4. Search
  const searchRes = await fetch(`${BASE_URL}/search?q=saffron`).then(r => r.json());
  console.log(`4. Search: Query "saffron" returns success=${searchRes.success}, products=${searchRes.data?.products?.length || 0}`);

  // 5. Articles
  const dbArticles = await prisma.article.count();
  const apiArticlesRes = await fetch(`${BASE_URL}/articles`).then(r => r.json());
  const apiArticles = Array.isArray(apiArticlesRes) ? apiArticlesRes : (apiArticlesRes.data || []);
  console.log(`5. Articles: DB=${dbArticles} | API=${apiArticles.length} | Match: ${dbArticles === apiArticles.length}`);

  // 6. Recipes
  const dbRecipes = await prisma.recipe.count();
  const apiRecipesRes = await fetch(`${BASE_URL}/recipes`).then(r => r.json());
  const apiRecipes = Array.isArray(apiRecipesRes) ? apiRecipesRes : (apiRecipesRes.data || []);
  console.log(`6. Recipes: DB=${dbRecipes} | API=${apiRecipes.length} | Match: ${dbRecipes === apiRecipes.length}`);

  // 7. Ingredients
  const dbIngredients = await prisma.ingredient.count();
  const apiIngredientsRes = await fetch(`${BASE_URL}/ingredients`).then(r => r.json());
  const apiIngredients = Array.isArray(apiIngredientsRes) ? apiIngredientsRes : (apiIngredientsRes.data || []);
  console.log(`7. Ingredients: DB=${dbIngredients} | API=${apiIngredients.length} | Match: ${dbIngredients === apiIngredients.length}`);

  // 8. Collections
  const dbCollections = await prisma.collection.count();
  const apiCollectionsRes = await fetch(`${BASE_URL}/collections`).then(r => r.json());
  const apiCollections = Array.isArray(apiCollectionsRes) ? apiCollectionsRes : (apiCollectionsRes.data || []);
  console.log(`8. Collections: DB=${dbCollections} | API=${apiCollections.length} | Match: ${dbCollections === apiCollections.length}`);

  // 9. Reviews for Saffron
  const saffron = await prisma.product.findUnique({ where: { slug: 'pure-kashmiri-mongra-saffron-grade-1' } });
  const dbReviews = await prisma.review.count({ where: { productId: saffron.id } });
  const apiReviewsRes = await fetch(`${BASE_URL}/reviews/product/${saffron.id}`).then(r => r.json());
  const apiReviews = Array.isArray(apiReviewsRes) ? apiReviewsRes : (apiReviewsRes.reviews || apiReviewsRes.data || []);
  console.log(`9. Reviews (Saffron): DB=${dbReviews} | API=${apiReviews.length} | Match: ${dbReviews === apiReviews.length}`);

  await prisma.$disconnect();
}

verifyApiSync().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
