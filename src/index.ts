import { cors } from 'hono/cors'
import { registerRoutes } from '~/app'
import { parseENV } from '~/config/env'
import configureOpenAPI from '~/lib/configure-open-api'
import createApp from '~/lib/create-app'

await parseENV()
const app = createApp()

const frontendUrl = Bun.env.FRONTEND_URL ?? 'http://localhost:3000'

app.get('/health', c => c.json({ status: 'ok' }))

app.use(
  '*',
  cors({
    origin: frontendUrl,
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
