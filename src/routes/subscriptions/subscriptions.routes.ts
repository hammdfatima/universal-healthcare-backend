import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  checkoutBodySchema,
  checkoutSessionSchema,
  checkoutVerifyQuerySchema,
  messageResponseSchema,
  subscriptionMeSchema,
} from '~/routes/subscriptions/subscriptions.schemas'

export const SUBSCRIPTION_ROUTES = {
  getMe: createRoute({
    method: 'get',
    tags: ['Subscriptions'],
    path: '/subscriptions/me',
    summary: 'Get current user subscription',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(subscriptionMeSchema),
        'Current subscription'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  createCheckout: createRoute({
    method: 'post',
    tags: ['Subscriptions'],
    path: '/subscriptions/checkout',
    summary: 'Create Stripe checkout session',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(checkoutBodySchema, 'Checkout payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(checkoutSessionSchema),
        'Checkout session created'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid plan'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),

  verifyCheckout: createRoute({
    method: 'get',
    tags: ['Subscriptions'],
    path: '/subscriptions/checkout/verify',
    summary: 'Verify Stripe checkout session',
    security: [{ bearerAuth: [] }],
    request: {
      query: checkoutVerifyQuerySchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(subscriptionMeSchema),
        'Checkout verified'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Checkout not completed'
      ),
      [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Unauthorized'
      ),
    },
  }),
}
