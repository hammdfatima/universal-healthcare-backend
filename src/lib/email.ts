import { COMPANY_NAME, DEFAULT_FROM_EMAIL } from '~/config/constants'

type SendEmailInput = {
  to: string
  subject: string
  text: string
}

export async function sendEmail({ to, subject, text }: SendEmailInput) {
  const apiKey = Bun.env.RESEND_API_KEY

  if (apiKey) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${COMPANY_NAME} <${DEFAULT_FROM_EMAIL.no_reply}>`,
        to: [to],
        subject,
        text,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Failed to send email: ${errorBody}`)
    }

    return
  }

  console.log(`[email] To: ${to}\nSubject: ${subject}\n${text}`)
}

export async function sendVerificationEmail(email: string, code: string) {
  await sendEmail({
    to: email,
    subject: `${COMPANY_NAME} email verification code`,
    text: `Your ${COMPANY_NAME} verification code is ${code}. It expires in 10 minutes.`,
  })
}

export async function sendPasswordResetEmail(email: string, code: string) {
  await sendEmail({
    to: email,
    subject: `${COMPANY_NAME} password reset code`,
    text: `Your ${COMPANY_NAME} password reset code is ${code}. It expires in 10 minutes.`,
  })
}
