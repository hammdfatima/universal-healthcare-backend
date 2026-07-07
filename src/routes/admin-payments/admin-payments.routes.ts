import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  adminPaymentSchema,
  adminPaymentsListSchema,
  messageResponseSchema,
  paymentIdParamSchema,
} from '~/routes/admin-payments/admin-payments.schemas'

export const ADMIN_PAYMENTS_ROUTES = {
  listPayments: createRoute({
    method: 'get',
    tags: ['Admin Payments'],
    path: '/admin/payments',
    summary: 'List all payment records (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(adminPaymentsListSchema),
        'Payments list'
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

  getPaymentById: createRoute({
    method: 'get',
    tags: ['Admin Payments'],
    path: '/admin/payments/{id}',
    summary: 'Get a payment record by id (admin)',
    security: [{ bearerAuth: [] }],
    request: {
      params: paymentIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(adminPaymentSchema),
        'Payment details'
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
