const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const vendors = await prisma.vendor.findMany({
      select: { id: true, slug: true, businessName: true, email: true, status: true, isActive: true }
    });
    console.log('VERIFIED VENDORS IN NEON:');
    console.table(vendors);

    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, isActive: true }
    });
    console.log('\nCATEGORIES IN NEON:');
    console.table(categories);

    const collections = await prisma.collection.findMany({
      include: { products: { include: { product: true } } }
    });
    console.log('\nCOLLECTIONS IN NEON:');
    console.log(JSON.stringify(collections, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
