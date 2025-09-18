// /lib/db.ts or /src/lib/db.ts

import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// Initialize system on server startup
if (typeof window === 'undefined') {
  import('./startup').then(({ initializeSystem }) => {
    initializeSystem().catch((error) => {
      console.error('System initialization failed:', error)
    })
  })
}

// Test the connection
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully')
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error)
  })