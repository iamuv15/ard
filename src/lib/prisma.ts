import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if we need to append sslmode for Supabase
let connectionString = process.env.DATABASE_URL!
if (connectionString && connectionString.includes('supabase') && !connectionString.includes('sslmode')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require'
}

const adapter = new PrismaPg({
  connectionString,
  // Serverless pooling configuration to prevent stale socket timeouts
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10s connection timeout
})

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
