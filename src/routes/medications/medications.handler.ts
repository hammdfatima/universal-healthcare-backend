import * as HttpStatusCodes from 'stoker/http-status-codes'
import { HttpError } from '~/lib/error'
import type { MEDICATIONS_ROUTES } from '~/routes/medications/medications.routes'
import {
  createMedication,
  deleteMedication,
  listMedications,
  updateMedication,
} from '~/routes/medications/medications.service'
import type { HandlerMapFromRoutes } from '~/types'

export const MEDICATIONS_ROUTE_HANDLER: HandlerMapFromRoutes<
  typeof MEDICATIONS_ROUTES
> = {
  listMedications: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const patientUserId = c.req.query('patientUserId')
    const data = await listMedications(authUser.user_id, patientUserId)

    return c.json(
      {
        success: true,
        message: 'Medications fetched successfully.',
        data,
      },
      HttpStatusCodes.OK
    )
  },

  createMedication: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const body = c.req.valid('json')
    const medication = await createMedication(authUser.user_id, body)

    return c.json(
      {
        success: true,
        message: 'Medication created successfully.',
        data: medication,
      },
      HttpStatusCodes.CREATED
    )
  },

  updateMedication: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    const medication = await updateMedication(authUser.user_id, id, body)

    return c.json(
      {
        success: true,
        message: 'Medication updated successfully.',
        data: medication,
      },
      HttpStatusCodes.OK
    )
  },

  deleteMedication: async c => {
    const authUser = c.get('user')

    if (!authUser) {
      throw new HttpError('Unauthorized', 401)
    }

    const { id } = c.req.valid('param')
    await deleteMedication(authUser.user_id, id)

    return c.json(
      {
        success: true,
        message: 'Medication deleted successfully.',
        data: { message: 'Medication deleted successfully.' },
      },
      HttpStatusCodes.OK
    )
  },
}
