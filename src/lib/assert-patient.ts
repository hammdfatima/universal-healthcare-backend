import { USER_ROLES } from '~/config/roles'
import { HttpError } from '~/lib/error'
import prisma from '~/lib/prisma'

export async function assertPatientUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isBlocked: true },
  })

  if (!user) {
    throw new HttpError('User not found.', 404)
  }

  if (user.role !== USER_ROLES.USER) {
    throw new HttpError('Forbidden', 403)
  }

  if (user.isBlocked) {
    throw new HttpError('Your account has been blocked. Contact support.', 403)
  }

  return user
}
