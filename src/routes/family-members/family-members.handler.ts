import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { FAMILY_MEMBERS_ROUTES } from '~/routes/family-members/family-members.routes'
import {
  createFamilyMember,
  deleteFamilyMember,
  listFamilyMembers,
  updateFamilyMember,
} from '~/routes/family-members/family-members.service'
import type { HandlerMapFromRoutes } from '~/types'

export const FAMILY_MEMBERS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof FAMILY_MEMBERS_ROUTES
> = {
  listFamilyMembers: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await listFamilyMembers(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Family members fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createFamilyMember: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const member = await createFamilyMember(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Family member created successfully.',
        data: member,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateFamilyMember: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const member = await updateFamilyMember(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Family member updated successfully.',
        data: member,
      },
      HttpStatusCodes.OK
    )
  },

  deleteFamilyMember: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteFamilyMember(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Family member deleted successfully.',
        data: { message: 'Family member deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
