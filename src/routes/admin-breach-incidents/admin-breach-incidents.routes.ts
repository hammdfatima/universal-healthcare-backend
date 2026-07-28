import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  breachIncidentIdParamSchema,
  breachIncidentSchema,
  breachIncidentsListSchema,
  createBreachIncidentBodySchema,
  messageResponseSchema,
  updateBreachIncidentBodySchema,
} from '~/routes/admin-breach-incidents/admin-breach-incidents.schemas'

export const ADMIN_BREACH_INCIDENTS_ROUTES = {
  listBreachIncidents: createRoute({
    method: 'get',
    tags: ['Admin Breach Incidents'],
    path: '/admin/breach-incidents',
    summary: 'List breach incidents (admin)',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(breachIncidentsListSchema),
        'Breach incidents list'
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

  createBreachIncident: createRoute({
    method: 'post',
    tags: ['Admin Breach Incidents'],
    path: '/admin/breach-incidents',
    summary: 'Log a new breach incident (admin)',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createBreachIncidentBodySchema,
        'Breach incident payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(breachIncidentSchema),
        'Breach incident created'
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

  updateBreachIncident: createRoute({
    method: 'patch',
    tags: ['Admin Breach Incidents'],
    path: '/admin/breach-incidents/{id}',
    summary: 'Update a breach incident (admin)',
    security: [{ bearerAuth: [] }],
    request: {
      params: breachIncidentIdParamSchema,
      body: jsonContentRequired(
        updateBreachIncidentBodySchema,
        'Breach incident update payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(breachIncidentSchema),
        'Breach incident updated'
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

  deleteBreachIncident: createRoute({
    method: 'delete',
    tags: ['Admin Breach Incidents'],
    path: '/admin/breach-incidents/{id}',
    summary: 'Delete a breach incident record (admin)',
    security: [{ bearerAuth: [] }],
    request: {
      params: breachIncidentIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Breach incident deleted'
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
} as const
