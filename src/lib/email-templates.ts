import { COMPANY_NAME, DEFAULT_FROM_EMAIL } from '~/config/constants'

const BRAND_GREEN = '#1f6b52'
const BRAND_GREEN_LIGHT = '#e8f3ef'
const TEXT_MUTED = '#64748b'
const BORDER = '#e2e8f0'

export function getEmailLogoUrl() {
  const frontendUrl = Bun.env.FRONTEND_URL ?? 'https://universal-healthcrae-frontend.onrender.com'

  return `${frontendUrl.replace(/\/$/, '')}/logo-half.png`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

type EmailLayoutInput = {
  title: string
  preheader?: string
  bodyHtml: string
}

export function renderEmailLayout({ title, preheader, bodyHtml }: EmailLayoutInput) {
  const logoUrl = getEmailLogoUrl()
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    ${
      preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`
        : ''
    }
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid ${BORDER};border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
            <tr>
              <td style="padding:28px 32px 20px;text-align:center;background:linear-gradient(180deg, ${BRAND_GREEN_LIGHT} 0%, #ffffff 100%);">
                <img src="${logoUrl}" alt="${escapeHtml(COMPANY_NAME)}" width="72" height="72" style="display:block;margin:0 auto 16px;border:0;" />
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;color:#334155;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${TEXT_MUTED};text-align:center;">
                <p style="margin:0 0 8px;">${escapeHtml(COMPANY_NAME)}</p>
                <p style="margin:0;">&copy; ${year} ${escapeHtml(COMPANY_NAME)}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function renderPrimaryButton(label: string, href: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 8px;">
    <tr>
      <td style="border-radius:999px;background-color:${BRAND_GREEN};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`
}

function renderCredentialRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT_MUTED};width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:#0f172a;font-weight:600;word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`
}

function renderCodeBlock(code: string) {
  return `<div style="margin:20px 0;padding:18px 20px;border-radius:16px;background-color:${BRAND_GREEN_LIGHT};text-align:center;">
    <p style="margin:0 0 8px;font-size:13px;color:${TEXT_MUTED};">Your verification code</p>
    <p style="margin:0;font-size:32px;line-height:1;letter-spacing:0.3em;font-weight:700;color:${BRAND_GREEN};">${escapeHtml(code)}</p>
  </div>`
}

export function renderFamilyMemberWelcomeEmail(input: {
  firstName: string
  loginUrl: string
  email: string
  password: string
}) {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.firstName)},</p>
    <p style="margin:0 0 16px;">
      You have been added to a ${escapeHtml(COMPANY_NAME)} family account.
      Use the credentials below to sign in and access your health dashboard.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;border:1px solid ${BORDER};border-radius:16px;background-color:#fafafa;">
      <tr>
        <td style="padding:16px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${renderCredentialRow('Email', input.email)}
            ${renderCredentialRow('Temporary password', input.password)}
          </table>
        </td>
      </tr>
    </table>
    ${renderPrimaryButton('Sign in to your account', input.loginUrl)}
    <p style="margin:16px 0 0;font-size:14px;color:${TEXT_MUTED};">
      For your security, you will be asked to change your password the first time you sign in.
    </p>
    <p style="margin:16px 0 0;font-size:14px;color:${TEXT_MUTED};">
      If you did not expect this invitation, please contact
      <a href="mailto:${DEFAULT_FROM_EMAIL.info}" style="color:${BRAND_GREEN};text-decoration:none;">${DEFAULT_FROM_EMAIL.info}</a>.
    </p>
  `

  return renderEmailLayout({
    title: 'Your account is ready',
    preheader: `Your ${COMPANY_NAME} login details are inside.`,
    bodyHtml,
  })
}

export function renderVerificationEmail(code: string) {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Use the verification code below to confirm your email address.</p>
    ${renderCodeBlock(code)}
    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};">
      This code expires in 10 minutes. If you did not create an account, you can safely ignore this email.
    </p>
  `

  return renderEmailLayout({
    title: 'Verify your email',
    preheader: `Your ${COMPANY_NAME} verification code is ${code}.`,
    bodyHtml,
  })
}

export function renderPasswordResetEmail(code: string) {
  const bodyHtml = `
    <p style="margin:0 0 16px;">We received a request to reset your password.</p>
    ${renderCodeBlock(code)}
    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};">
      This code expires in 10 minutes. If you did not request a password reset, you can safely ignore this email.
    </p>
  `

  return renderEmailLayout({
    title: 'Reset your password',
    preheader: `Your ${COMPANY_NAME} password reset code is ${code}.`,
    bodyHtml,
  })
}

export function renderFamilyMemberWelcomeText(input: {
  firstName: string
  loginUrl: string
  email: string
  password: string
}) {
  return [
    `Hi ${input.firstName},`,
    '',
    `You have been added to a ${COMPANY_NAME} family account.`,
    '',
    'Use the details below to sign in:',
    `Login page: ${input.loginUrl}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.password}`,
    '',
    'For your security, you will be asked to change your password the first time you sign in.',
    '',
    `If you did not expect this invitation, please contact ${DEFAULT_FROM_EMAIL.info}.`,
  ].join('\n')
}

export function renderVerificationText(code: string) {
  return `Your ${COMPANY_NAME} verification code is ${code}. It expires in 10 minutes.`
}

export function renderPasswordResetText(code: string) {
  return `Your ${COMPANY_NAME} password reset code is ${code}. It expires in 10 minutes.`
}

export function renderUserQueryReplyEmail(input: {
  fullName: string
  subjectLabel: string
  originalMessage: string
  reply: string
}) {
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${escapeHtml(input.fullName)},</p>
    <p style="margin:0 0 16px;">
      Thank you for contacting ${escapeHtml(COMPANY_NAME)}. Here is our response to your
      <strong>${escapeHtml(input.subjectLabel)}</strong> inquiry:
    </p>
    <div style="margin:0 0 20px;padding:16px 18px;border-radius:16px;background-color:#fafafa;border:1px solid ${BORDER};">
      <p style="margin:0 0 8px;font-size:12px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Your message</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;">${escapeHtml(input.originalMessage)}</p>
    </div>
    <div style="margin:0 0 16px;padding:16px 18px;border-radius:16px;background-color:${BRAND_GREEN_LIGHT};border:1px solid ${BORDER};">
      <p style="margin:0 0 8px;font-size:12px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.08em;">Our reply</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#0f172a;white-space:pre-wrap;">${escapeHtml(input.reply)}</p>
    </div>
    <p style="margin:0;font-size:14px;color:${TEXT_MUTED};">
      If you need further assistance, reply to this email or contact us at
      <a href="mailto:${DEFAULT_FROM_EMAIL.info}" style="color:${BRAND_GREEN};text-decoration:none;">${DEFAULT_FROM_EMAIL.info}</a>.
    </p>
  `

  return renderEmailLayout({
    title: 'Response to your inquiry',
    preheader: `We replied to your ${input.subjectLabel.toLowerCase()} request.`,
    bodyHtml,
  })
}

export function renderUserQueryReplyText(input: {
  fullName: string
  subjectLabel: string
  originalMessage: string
  reply: string
}) {
  return [
    `Hi ${input.fullName},`,
    '',
    `Thank you for contacting ${COMPANY_NAME}. Here is our response to your ${input.subjectLabel} inquiry:`,
    '',
    'Your message:',
    input.originalMessage,
    '',
    'Our reply:',
    input.reply,
    '',
    `If you need further assistance, contact us at ${DEFAULT_FROM_EMAIL.info}.`,
  ].join('\n')
}
