import { createRouter } from '~/lib/create-app'
import { requirePatient } from '~/middleware/require-admin'
import { FILE_ROUTE_HANDLER } from '~/routes/files/files.handler'
import { FILE_ROUTES } from '~/routes/files/files.routes'

const router = createRouter()

router.use('/files', requirePatient)
router.use('/files/*', requirePatient)

router
  .openapi(FILE_ROUTES.upload, FILE_ROUTE_HANDLER.upload)
  .openapi(FILE_ROUTES.list, FILE_ROUTE_HANDLER.list)
  .openapi(FILE_ROUTES.delete, FILE_ROUTE_HANDLER.delete)

export default router
