import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { FILE_ROUTES } from '~/routes/files/files.routes'
import {
  deleteUserFile,
  listUserFiles,
  uploadUserFile,
} from '~/routes/files/files.service'
import type { HandlerMapFromRoutes } from '~/types'

export const FILE_ROUTE_HANDLER: HandlerMapFromRoutes<typeof FILE_ROUTES> = {
  upload: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = await c.req.parseBody()
    const file = body.file

    if (!(file instanceof File)) {
      return c.json(
        {
          success: false,
          message: 'A valid file is required.',
        },
        HttpStatusCodes.BAD_REQUEST
      )
    }

    const uploaded = await uploadUserFile(file, authUser)

    return c.json(
      {
        success: true,
        message: 'File uploaded successfully.',
        data: uploaded,
      },
      HttpStatusCodes.CREATED
    )
  },

  list: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const files = await listUserFiles(authUser)

    return c.json(
      {
        success: true,
        message: 'Files fetched successfully.',
        data: files,
      },
      HttpStatusCodes.OK
    )
  },

  delete: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { publicId, resourceType } = c.req.valid('json')
    const result = await deleteUserFile(authUser, publicId, resourceType)

    return c.json(
      {
        success: true,
        message: 'File deleted successfully.',
        data: result,
      },
      HttpStatusCodes.OK
    )
  },
}
