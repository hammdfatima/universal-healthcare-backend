import { API_START_POINT } from '~/config/constants'
import emergencyAccessRouter from '~/routes/emergency-access'
import adminDashboardRouter from '~/routes/admin-dashboard'
import adminPaymentsRouter from '~/routes/admin-payments'
import adminAuditLogsRouter from '~/routes/admin-audit-logs'
import adminProfileRouter from '~/routes/admin-profile'
import authRouter from '~/routes/auth'
import filesRouter from '~/routes/files'
import allergiesRouter from '~/routes/allergies'
import careProvidersRouter from '~/routes/care-providers'
import familyLifestyleHistoryRouter from '~/routes/family-lifestyle-history'
import familyMembersRouter from '~/routes/family-members'
import healthHistoryRouter from '~/routes/health-history'
import imagingResultsRouter from '~/routes/imaging-results'
import labResultsRouter from '~/routes/lab-results'
import medicationsRouter from '~/routes/medications'
import medicalRecordSharesRouter from '~/routes/medical-record-shares'
import notificationsRouter from '~/routes/notifications'
import patientDashboardRouter from '~/routes/patient-dashboard'
import patientProfileRouter from '~/routes/patient-profile'
import petsRouter from '~/routes/pets'
import pharmaciesRouter from '~/routes/pharmacies'
import vaccinationsRouter from '~/routes/vaccinations'
import patientSettingsRouter from '~/routes/patient-settings'
import subscriptionsRouter from '~/routes/subscriptions'
import subscriptionPlansRouter from '~/routes/subscription-plans'
import usersRouter from '~/routes/users'
import userQueriesRouter from '~/routes/user-queries'
import testRouter from '~/routes/test'
import type { AppOpenAPI } from '~/types'

export function registerRoutes(app: AppOpenAPI) {
  const registered = app
    .route(API_START_POINT, authRouter)
    .route(API_START_POINT, subscriptionPlansRouter)
    .route(API_START_POINT, usersRouter)
    .route(API_START_POINT, adminDashboardRouter)
    .route(API_START_POINT, adminPaymentsRouter)
    .route(API_START_POINT, adminAuditLogsRouter)
    .route(API_START_POINT, userQueriesRouter)
    .route(API_START_POINT, adminProfileRouter)
    .route(API_START_POINT, filesRouter)
    .route(API_START_POINT, patientProfileRouter)
    .route(API_START_POINT, patientDashboardRouter)
    .route(API_START_POINT, familyMembersRouter)
    .route(API_START_POINT, petsRouter)
    .route(API_START_POINT, careProvidersRouter)
    .route(API_START_POINT, pharmaciesRouter)
    .route(API_START_POINT, medicationsRouter)
    .route(API_START_POINT, medicalRecordSharesRouter)
    .route(API_START_POINT, notificationsRouter)
    .route(API_START_POINT, allergiesRouter)
    .route(API_START_POINT, healthHistoryRouter)
    .route(API_START_POINT, familyLifestyleHistoryRouter)
    .route(API_START_POINT, vaccinationsRouter)
    .route(API_START_POINT, labResultsRouter)
    .route(API_START_POINT, imagingResultsRouter)
    .route(API_START_POINT, patientSettingsRouter)
    .route(API_START_POINT, emergencyAccessRouter)
    .route(API_START_POINT, subscriptionsRouter)

  if (Bun.env.NODE_ENV !== 'production') {
    return registered.route('/test', testRouter)
  }

  return registered
}
