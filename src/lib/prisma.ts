import { Prisma, PrismaClient } from '~/generated/prisma'

const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
  'P2024', // Timed out fetching a new connection from the pool
])

function isTransientPrismaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code)
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('connection') ||
      message.includes('closed') ||
      message.includes('timed out') ||
      message.includes("can't reach database")
    )
  }

  return false
}

function withConnectTimeout(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return databaseUrl
  }

  if (/[?&]connect_timeout=/.test(databaseUrl)) {
    return databaseUrl
  }

  return `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connect_timeout=30`
}

const baseClient = new PrismaClient({
  datasources: {
    db: {
      url: withConnectTimeout(Bun.env.DATABASE_URL),
    },
  },
})

/**
 * Neon auto-suspends after ~5 minutes of idle traffic. Long-running Render
 * instances then hold dead sockets; reconnect once and retry the query.
 */
const prisma = baseClient.$extends({
  query: {
    async $allOperations({ args, query }) {
      try {
        return await query(args)
      } catch (error) {
        if (!isTransientPrismaError(error)) {
          throw error
        }

        try {
          await baseClient.$disconnect()
        } catch {
          // ignore disconnect failures before reconnect
        }

        await baseClient.$connect()
        return query(args)
      }
    },
  },
})

export default prisma
