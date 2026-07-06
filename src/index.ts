import { cors } from 'hono/cors'
import { registerRoutes } from '~/app'
import { parseENV } from '~/config/env'
import configureOpenAPI from '~/lib/configure-open-api'
import createApp from '~/lib/create-app'

await parseENV()
const app = createApp()

function normalizeOrigin(url: string) {
  return url.replace(/\/$/, '')
}

function getAllowedOrigins() {
  const origins = new Set<string>(['http://localhost:3000'])

  if (Bun.env.FRONTEND_URL) {
    origins.add(normalizeOrigin(Bun.env.FRONTEND_URL))
  }

  return [...origins]
}

const allowedOrigins = getAllowedOrigins()

app.get('/health', c => c.json({ status: 'ok' }))

app.use(
  '*',
  cors({
    origin: origin => {
      if (!origin) {
        return allowedOrigins[0]
      }

      const normalizedOrigin = normalizeOrigin(origin)

      if (allowedOrigins.includes(normalizedOrigin)) {
        return origin
      }

      return allowedOrigins[0]
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
)
registerRoutes(app)
configureOpenAPI(app)
console.log('API reference available at http://localhost:8080/reference')

export default {
  fetch: app.fetch,
  port: Number(Bun.env.PORT_NO ?? Bun.env.PORT ?? 8080),
  hostname: '0.0.0.0',
}
