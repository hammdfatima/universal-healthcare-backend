import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  adminProfileBodySchema,
  adminProfileSchema,
  changePasswordBodySchema,
  messageResponseSchema,
} from '~/routes/admin-profile/admin-profile.schemas'

export const ADMIN_PROFILE_ROUTES = {
  getProfile: createRoute({
    method: 'get',
    tags: ['Admin Profile'],
    path: '/admin/profile',
    summary: 'Get admin profile',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(adminProfileSchema),
        'Admin profile'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Forbidden'
      ),
    },
  }),

  updateProfile: createRoute({
    method: 'patch',
    tags: ['Admin Profile'],
    path: '/admin/profile',
    summary: 'Update admin profile',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(adminProfileBodySchema, 'Admin profile payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(adminProfileSchema),
        'Admin profile updated'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Forbidden'
      ),
      [HttpStatusCodes.CONFLICT]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Email already in use'
      ),
    },
  }),

  changePassword: createRoute({
    method: 'post',
    tags: ['Admin Profile'],
    path: '/admin/change-password',
    summary: 'Change admin password',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(changePasswordBodySchema, 'Change password payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Password updated'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid current password'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
      [HttpStatusCodes.FORBIDDEN]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Forbidden'
      ),
    },
  }),
}
