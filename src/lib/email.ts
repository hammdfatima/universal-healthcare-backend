import { COMPANY_NAME, DEFAULT_FROM_EMAIL } from '~/config/constants'
import {
  renderFamilyMemberWelcomeEmail,
  renderFamilyMemberWelcomeText,
  renderPasswordResetEmail,
  renderPasswordResetText,
  renderSignInEmail,
  renderSignInText,
  renderUserQueryReplyEmail,
  renderUserQueryReplyText,
  renderVerificationEmail,
  renderVerificationText,
} from '~/lib/email-templates'
import prisma from '~/lib/prisma'

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html: string
}

type OptionalEmailInput = SendEmailInput & {
  respectEmailPreferences?: boolean
}

async function canSendOptionalEmailToRecipient(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { emailNotifications: true },
  })

  if (!user) {
    return true
  }

  return user.emailNotifications
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  respectEmailPreferences = false,
}: OptionalEmailInput) {
  if (respectEmailPreferences && !(await canSendOptionalEmailToRecipient(to))) {
    console.log(`[email] Skipped for ${to} (email notifications disabled): ${subject}`)
    return
  }

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
        html,
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
    text: renderVerificationText(code),
    html: renderVerificationEmail(code),
  })
}

export async function sendPasswordResetEmail(email: string, code: string) {
  await sendEmail({
    to: email,
    subject: `${COMPANY_NAME} password reset code`,
    text: renderPasswordResetText(code),
    html: renderPasswordResetEmail(code),
  })
}

export async function sendSignInEmail(input: {
  to: string
  firstName: string
  formattedTime: string
  ipAddress?: string | null
}) {
  await sendEmail({
    to: input.to,
    subject: `New sign-in to your ${COMPANY_NAME} account`,
    text: renderSignInText(input),
    html: renderSignInEmail(input),
    respectEmailPreferences: true,
  })
}

export async function sendFamilyMemberWelcomeEmail(input: {
  to: string
  firstName: string
  loginUrl: string
  email: string
  password: string
}) {
  await sendEmail({
    to: input.to,
    subject: `Your ${COMPANY_NAME} account is ready`,
    text: renderFamilyMemberWelcomeText(input),
    html: renderFamilyMemberWelcomeEmail(input),
    respectEmailPreferences: true,
  })
}

export async function sendUserQueryReplyEmail(input: {
  to: string
  fullName: string
  subjectLabel: string
  originalMessage: string
  reply: string
}) {
  await sendEmail({
    to: input.to,
    subject: `Re: ${input.subjectLabel} — ${COMPANY_NAME}`,
    text: renderUserQueryReplyText(input),
    html: renderUserQueryReplyEmail(input),
    respectEmailPreferences: true,
  })
}
