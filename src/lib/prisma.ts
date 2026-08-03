import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  dbInitialized: boolean | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

if (!globalForPrisma.dbInitialized) {
  try {
    const dbUrl = process.env.DATABASE_URL || ''
    if (dbUrl.startsWith('file:')) {
      execSync('npx prisma db push --skip-generate', {
        env: { ...process.env },
        stdio: 'ignore'
      })
    }
  } catch (e) {
    console.error("Prisma db push auto-init error:", e)
  }
  globalForPrisma.dbInitialized = true
}
