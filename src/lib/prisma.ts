import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let connectionString = process.env.DATABASE_URL || ''

// For Supabase / Postgres: If sslmode=require is present without uselibpqcompat,
// pg treats it as verify-full which fails on certificate chains in serverless runtimes.
if (connectionString.includes('sslmode=require') && !connectionString.includes('uselibpqcompat')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'uselibpqcompat=true'
}

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
