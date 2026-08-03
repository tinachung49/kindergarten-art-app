import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitPromise: Promise<void> | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

async function initDb() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('file:')) {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT,
            "email" TEXT UNIQUE,
            "emailVerified" DATETIME,
            "image" TEXT
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Account" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "provider" TEXT NOT NULL,
            "providerAccountId" TEXT NOT NULL,
            "refresh_token" TEXT,
            "access_token" TEXT,
            "expires_at" INTEGER,
            "token_type" TEXT,
            "scope" TEXT,
            "id_token" TEXT,
            "session_state" TEXT,
            "refresh_token_expires_in" INTEGER,
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
            CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "sessionToken" TEXT NOT NULL UNIQUE,
            "userId" TEXT NOT NULL,
            "expires" DATETIME NOT NULL,
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "VerificationToken" (
            "identifier" TEXT NOT NULL,
            "token" TEXT NOT NULL UNIQUE,
            "expires" DATETIME NOT NULL,
            CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token")
        );
      `)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Conversation" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "studentName" TEXT NOT NULL,
            "documentId" TEXT NOT NULL,
            "documentUrl" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
        );
      `)
    } catch (e) {
      console.error("Failed to auto-create SQLite tables:", e)
    }
  }
}

if (!globalForPrisma.dbInitPromise) {
  globalForPrisma.dbInitPromise = initDb()
}
