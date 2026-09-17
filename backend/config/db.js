/**
 * FSO Database Connection — Neon PostgreSQL via Prisma ORM
 *
 * ABSOLUTE DATABASE RULE:
 * FSO authoritative persistent database is Neon PostgreSQL.
 * Siraba MongoDB is NEVER used.
 */

const prisma = require('./prisma');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return prisma;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "FATAL DATABASE ERROR: DATABASE_URL environment variable is missing.\n" +
      "FSO requires a valid Neon PostgreSQL connection string in .env"
    );
  }

  try {
    // Verify connection to Neon PostgreSQL
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    console.log("✅ FSO Database Connected: PostgreSQL (Neon)");
    isConnected = true;
    return prisma;
  } catch (error) {
    console.error(`❌ PostgreSQL Connection Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
