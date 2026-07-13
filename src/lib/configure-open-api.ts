import { Scalar } from '@scalar/hono-api-reference'
import type { AppOpenAPI } from '~/types'

function shouldEnableApiDocs() {
  if (Bun.env.ENABLE_API_DOCS === 'true') {
    return true
  }

  return Bun.env.NODE_ENV !== 'production'
}

export default function configureOpenAPI(app: AppOpenAPI) {
  if (!shouldEnableApiDocs()) {
    return
  }

  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: '1',
      title: 'API Docs',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  })

  app.get(
    '/reference',
    Scalar({
      theme: 'kepler',
      layout: 'modern',
      url: '/doc',
      showSidebar: true,
      hideModels: true,
      hideDownloadButton: false,
      hideTestRequestButton: false,
      searchHotKey: 'k',
      hiddenClients: true,
      hideClientButton: true,
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
      authentication: {
        preferredSecurityScheme: 'bearerAuth',
      },
    })
  )
}
