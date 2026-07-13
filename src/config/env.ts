import * as z from 'zod'

const envSchema = z
  .object({
    PORT: z.coerce.number().optional(),
    PORT_NO: z.coerce.number().optional(),
    JWT_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    PHI_ENCRYPTION_KEY: z
      .string()
      .min(1)
      .refine(value => {
        try {
          return Buffer.from(value, 'base64').length === 32
        } catch {
          return false
        }
      }, 'PHI_ENCRYPTION_KEY must be a 32-byte base64-encoded key'),
    ENABLE_API_DOCS: z
      .enum(['true', 'false'])
      .optional()
      .transform(value => value === 'true'),
    RESEND_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    FRONTEND_URL: z.string().url().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  })
  .transform(env => ({
    ...env,
    PORT_NO: env.PORT_NO ?? env.PORT ?? 8080,
  }))

export async function parseENV() {
  try {
    const parsed = envSchema.parse(Bun.env)
    Bun.env.PORT_NO = String(parsed.PORT_NO)
  } catch (err) {
    console.error('Invalid Env variables Configuration::::', err)
    process.exit(1)
  }
}

declare module 'bun' {
  interface Env extends z.TypeOf<typeof envSchema> {}
}
