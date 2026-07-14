import { HttpError } from '~/lib/error'
import { toAdminPaymentResponse } from '~/lib/payment-records'
import prisma from '~/lib/prisma'

const paymentInclude = {
  user: {
    select: {
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
    },
  },
  subscriptionPlan: {
    select: {
      planName: true,
    },
  },
} as const

export async function listAdminPayments() {
  const payments = await prisma.payment.findMany({
    include: paymentInclude,
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
  })

  return {
    payments: payments.map(toAdminPaymentResponse),
  }
}

export async function getAdminPaymentById(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: paymentInclude,
  })

  if (!payment) {
    throw new HttpError('Payment not found.', 404)
  }

  return toAdminPaymentResponse(payment)
}
