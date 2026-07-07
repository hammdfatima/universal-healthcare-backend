import { z } from '@hono/zod-openapi'

export const userQuerySubjectSchema = z.enum([
  'general',
  'support',
  'billing',
  'partnership',
])

export const userQuerySchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    email: z.string().email(),
    subject: z.string(),
    subjectLabel: z.string(),
    message: z.string(),
    isResolved: z.boolean(),
    reply: z.string().nullable(),
    repliedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('UserQuery')

export const userQueriesListSchema = z
  .object({
    queries: z.array(userQuerySchema),
  })
  .openapi('UserQueriesList')

export const createUserQueryBodySchema = z
  .object({
    fullName: z.string().min(2).openapi({ example: 'John Smith' }),
    email: z.string().email().openapi({ example: 'john@example.com' }),
    subject: userQuerySubjectSchema.openapi({ example: 'support' }),
    message: z
      .string()
      .min(10)
      .max(1000)
      .openapi({ example: 'How can I reset my password?' }),
  })
  .openapi('CreateUserQueryBody')

export const replyUserQueryBodySchema = z
  .object({
    reply: z
      .string()
      .min(1)
      .max(5000)
      .openapi({ example: 'Thank you for reaching out. Here is how to proceed...' }),
  })
  .openapi('ReplyUserQueryBody')

export const userQueryIdParamSchema = z.object({
  id: z.string().min(1),
})

export const messageResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi('UserQueryMessageResponse')
