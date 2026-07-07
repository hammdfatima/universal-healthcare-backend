export const USER_QUERY_SUBJECTS = {
  general: 'General Inquiry',
  support: 'Technical Support',
  billing: 'Billing & Subscriptions',
  partnership: 'Partnership',
} as const

export type UserQuerySubject = keyof typeof USER_QUERY_SUBJECTS

export function getUserQuerySubjectLabel(subject: string) {
  return (
    USER_QUERY_SUBJECTS[subject as UserQuerySubject] ??
    subject.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
  )
}

export function formatUserQueryDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
