import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { z } from 'zod'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  deleteFileBodySchema,
  messageResponseSchema,
  uploadedFileListSchema,
  uploadedFileSchema,
} from '~/routes/files/files.schemas'

const uploadFileFormSchema = z.object({
  file: z.custom<File>((value) => value instanceof File, 'File is required.'),
})

export const FILE_ROUTES = {
  upload: createRoute({
    method: 'post',
    tags: ['Files'],
    path: '/files/upload',
    summary: 'Upload a file to Cloudinary',
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: uploadFileFormSchema,
          },
        },
      },
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(uploadedFileSchema),
        'Uploaded file metadata'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid file'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
      [HttpStatusCodes.SERVICE_UNAVAILABLE]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Cloudinary not configured'
      ),
    },
  }),

  list: createRoute({
    method: 'get',
    tags: ['Files'],
    path: '/files',
    summary: 'List uploaded files for the current user',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(uploadedFileListSchema),
        'Uploaded files list'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  delete: createRoute({
    method: 'delete',
    tags: ['Files'],
    path: '/files',
    summary: 'Delete an uploaded file from Cloudinary',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(deleteFileBodySchema, 'Delete file payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'File deleted'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Forbidden'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),
}
