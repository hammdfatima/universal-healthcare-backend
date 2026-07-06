import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import { zodResponseSchema } from '~/lib/zod-helper'
import {
  createFamilyMemberBodySchema,
  familyMemberIdParamSchema,
  familyMemberSchema,
  familyMembersListSchema,
  messageResponseSchema,
  updateFamilyMemberBodySchema,
} from '~/routes/family-members/family-members.schemas'

export const FAMILY_MEMBERS_ROUTES = {
  listFamilyMembers: createRoute({
    method: 'get',
    tags: ['Family Members'],
    path: '/family-members',
    summary: 'List family members for the current account owner',
    security: [{ bearerAuth: [] }],
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(familyMembersListSchema),
        'Family members list'
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

  createFamilyMember: createRoute({
    method: 'post',
    tags: ['Family Members'],
    path: '/family-members',
    summary: 'Create a family member account',
    security: [{ bearerAuth: [] }],
    request: {
      body: jsonContentRequired(
        createFamilyMemberBodySchema,
        'Create family member payload'
      ),
    },
    responses: {
      [HttpStatusCodes.CREATED]: jsonContent(
        zodResponseSchema(familyMemberSchema),
        'Family member created'
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Invalid request'
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
        'Email already exists'
      ),
    },
  }),

  updateFamilyMember: createRoute({
    method: 'patch',
    tags: ['Family Members'],
    path: '/family-members/{id}',
    summary: 'Update a family member',
    security: [{ bearerAuth: [] }],
    request: {
      params: familyMemberIdParamSchema,
      body: jsonContentRequired(
        updateFamilyMemberBodySchema,
        'Update family member payload'
      ),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(familyMemberSchema),
        'Family member updated'
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

  deleteFamilyMember: createRoute({
    method: 'delete',
    tags: ['Family Members'],
    path: '/family-members/{id}',
    summary: 'Delete a family member',
    security: [{ bearerAuth: [] }],
    request: {
      params: familyMemberIdParamSchema,
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        zodResponseSchema(messageResponseSchema),
        'Family member deleted'
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
