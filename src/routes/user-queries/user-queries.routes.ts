import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createUserQueryBodySchema,
  messageResponseSchema,
  replyUserQueryBodySchema,
  userQueriesListSchema,
  userQueryIdParamSchema,
  userQuerySchema,
} from '~/routes/user-queries/user-queries.schemas'

export const USER_QUERIES_ROUTES = {
  createUserQuery: createRoute({
    method: 'post',
    tags: ['User Queries'],
    path: '/user-queries',
    summary: 'Submit a contact or support query',
    request: {
      body: jsonContentRequired(createUserQueryBodySchema, 'Create user query payload'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(userQuerySchema),
        'User query created'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid request'
      ),
    },
  }),

  listAdminUserQueries: createRoute({
    method: 'get',
    tags: ['User Queries'],
    path: '/admin/user-queries',
    summary: 'List all user queries (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(userQueriesListSchema),
        'User queries list'
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

  getAdminUserQuery: createRoute({
    method: 'get',
    tags: ['User Queries'],
    path: '/admin/user-queries/{id}',
    summary: 'Get a user query by id (admin)',
    security: [{ bearerAuth: [] }],
    request: {
      params: userQueryIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(userQuerySchema),
        'User query details'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Not found'
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

  replyToUserQuery: createRoute({
    method: 'post',
    tags: ['User Queries'],
    path: '/admin/user-queries/{id}/reply',
    summary: 'Reply to a user query and mark it resolved (admin)',
    security: [{ bearerAuth: [] }],
    request: {
      params: userQueryIdParamSchema,
      body: jsonContentRequired(replyUserQueryBodySchema, 'Reply payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(userQuerySchema),
        'Reply sent'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid request'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Not found'
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
