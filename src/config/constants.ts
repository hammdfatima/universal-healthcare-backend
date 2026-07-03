/**
 * Default email addresses for the application.
 */
export const DEFAULT_FROM_EMAIL = {
  no_reply: 'no-reply@universalhealthcharts.com',
  info: 'info@universalhealthcharts.com',
} as const
export type IDefaultEmail = keyof typeof DEFAULT_FROM_EMAIL
export const COMPANY_NAME = 'Universal Health Charts'
export const API_START_POINT = '/api/v1'
