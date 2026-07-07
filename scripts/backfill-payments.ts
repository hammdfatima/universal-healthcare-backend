import { backfillPaymentsFromStripeSubscriptions } from '../src/lib/payment-records'
import prisma from '../src/lib/prisma'

const result = await backfillPaymentsFromStripeSubscriptions()
const payments = await prisma.payment.count()

console.log('Backfill result:', result)
console.log('Total payments now:', payments)

const sample = await prisma.payment.findMany({
  take: 5,
  select: {
    invoiceNumber: true,
    amountCents: true,
    status: true,
    paidAt: true,
    userId: true,
  },
})

console.log('Sample payments:', JSON.stringify(sample, null, 2))

await prisma.$disconnect()
