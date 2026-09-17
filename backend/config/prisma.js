/**
 * FSO Prisma Client Singleton
 * Authoritative persistent database connection to Neon PostgreSQL.
 *
 * OWASP A03:2021 – Injection Prevention (all queries parameterized)
 */

const { PrismaClient } = require("@prisma/client");

// Ensure DATABASE_URL is present at module load
if (!process.env.DATABASE_URL) {
  throw new Error(
    "CRITICAL CONFIGURATION ERROR: DATABASE_URL is not defined in environment variables.\n" +
    "FSO requires a valid Neon PostgreSQL connection string in .env"
  );
}

// Global variable across hot reloads in development
const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.DEBUG_PRISMA === "true" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
