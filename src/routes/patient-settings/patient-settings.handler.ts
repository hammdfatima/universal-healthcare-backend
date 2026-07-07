import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { PATIENT_SETTINGS_ROUTES } from '~/routes/patient-settings/patient-settings.routes'
import {
  changePatientPassword,
  deletePatientAccount,
  exportPatientData,
  getPatientSettings,
  updatePatientAccountSettings,
  updatePatientSettingsProfile,
} from '~/routes/patient-settings/patient-settings.service'
import type { HandlerMapFromRoutes } from '~/types'

export const PATIENT_SETTINGS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof PATIENT_SETTINGS_ROUTES
> = {
  getSettings: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const settings = await getPatientSettings(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Settings fetched successfully.',
        data: settings,
      },
      HttpStatusCodes.OK
    )
  },

  updateProfile: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const settings = await updatePatientSettingsProfile(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Profile updated successfully.',
        data: settings,
      },
      HttpStatusCodes.OK
    )
  },

  updateAccount: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const settings = await updatePatientAccountSettings(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Account preferences updated successfully.',
        data: settings,
      },
      HttpStatusCodes.OK
    )
  },

  changePassword: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { currentPassword, newPassword } = c.req.valid('json')
    await changePatientPassword(authUser.user_id, currentPassword, newPassword)

    return c.json(
      {
        success: true,
        message: 'Password updated successfully.',
        data: { message: 'Password updated successfully.' },
      },
      HttpStatusCodes.OK
    )
  },

  exportData: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const data = await exportPatientData(authUser.user_id)

    return c.json(
      {
        success: true,
        message: 'Patient data exported successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  deleteAccount: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { confirmation } = c.req.valid('json')
    await deletePatientAccount(authUser.user_id, confirmation)

    return c.json(
      {
        success: true,
        message: 'Account deleted successfully.',
        data: { message: 'Account deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
