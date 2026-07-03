import * as HttpStatusCodes from 'stoker/http-status-codes'
import type { ADMIN_PROFILE_ROUTES } from '~/routes/admin-profile/admin-profile.routes'
import {
  changeAdminPassword,
  getAdminProfile,
  updateAdminProfile,
} from '~/routes/admin-profile/admin-profile.service'
import type { HandlerMapFromRoutes } from '~/types'

export const ADMIN_PROFILE_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof ADMIN_PROFILE_ROUTES
> = {
  getProfile: async c => {
    const authUser = c.get('user')
    const profile = await getAdminProfile(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Profile fetched successfully.',
        data: profile,
      },
      HttpStatusCodes.OK
    )
  },

  updateProfile: async c => {
    const authUser = c.get('user')
    const body = c.req.valid('json')
    const profile = await updateAdminProfile(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Profile updated successfully.',
        data: profile,
      },
      HttpStatusCodes.OK
    )
  },

  changePassword: async c => {
    const authUser = c.get('user')
    const { currentPassword, newPassword } = c.req.valid('json')

    await changeAdminPassword(authUser.user_id, currentPassword, newPassword)

    return c.json(
      {
        success: true,
        message: 'Password updated successfully.',
        data: { message: 'Password updated successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
