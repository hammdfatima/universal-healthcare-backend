import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  messageResponseSchema,
  subscriptionPlanBodySchema,
  subscriptionPlanIdParamSchema,
  subscriptionPlanListSchema,
  subscriptionPlanSchema,
} from '~/routes/subscription-plans/subscription-plans.schemas'

export const SUBSCRIPTION_PLAN_ROUTES = {
  listPublic: createRoute({
    method: 'get',
    tags: ['Subscription Plans'],
    path: '/subscription-plans',
    summary: 'List subscription plans (public)',
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(subscriptionPlanListSchema),
        'Subscription plans list'
      ),
    },
  }),

  listAdmin: createRoute({
    method: 'get',
    tags: ['Subscription Plans'],
    path: '/admin/subscription-plans',
    summary: 'List subscription plans (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(subscriptionPlanListSchema),
        'Subscription plans list'
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

  create: createRoute({
    method: 'post',
    tags: ['Subscription Plans'],
    path: '/admin/subscription-plans',
    summary: 'Create subscription plan',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(subscriptionPlanBodySchema, 'Subscription plan payload'),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(subscriptionPlanSchema),
        'Subscription plan created'
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

  update: createRoute({
    method: 'put',
    tags: ['Subscription Plans'],
    path: '/admin/subscription-plans/{id}',
    summary: 'Update subscription plan',
    security: [{ bearerAuth: [] }],
    request: {
      params: subscriptionPlanIdParamSchema,
      body: jsonContentRequired(subscriptionPlanBodySchema, 'Subscription plan payload'),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(subscriptionPlanSchema),
        'Subscription plan updated'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Subscription plan not found'
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

  delete: createRoute({
    method: 'delete',
    tags: ['Subscription Plans'],
    path: '/admin/subscription-plans/{id}',
    summary: 'Delete subscription plan',
    security: [{ bearerAuth: [] }],
    request: {
      params: subscriptionPlanIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Subscription plan deleted'
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Subscription plan not found'
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
