import { z } from '@hono/zod-openapi'

export const paymentStatusSchema = z.enum(['paid', 'pending', 'failed'])

export const adminPaymentSchema = z
  .object({
    id: z.string(),
    invoiceNumber: z.string(),
    user: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    address: z.string().nullable(),
    plan: z.string(),
    amount: z.string(),
    status: paymentStatusSchema,
    date: z.string(),
    billingCycle: z.string(),
    paymentMethod: z.string(),
    transactionId: z.string(),
  })
  .openapi('AdminPayment')

export const adminPaymentsListSchema = z
  .object({
    payments: z.array(adminPaymentSchema),
  })
  .openapi('AdminPaymentsList')

export const paymentIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('AdminPaymentMessageResponse')
