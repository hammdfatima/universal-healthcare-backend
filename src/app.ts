import { API_START_POINT } from '~/config/constants'
import adminProfileRouter from '~/routes/admin-profile'
import authRouter from '~/routes/auth'
import filesRouter from '~/routes/files'
import familyMembersRouter from '~/routes/family-members'
import patientProfileRouter from '~/routes/patient-profile'
import patientSettingsRouter from '~/routes/patient-settings'
import subscriptionsRouter from '~/routes/subscriptions'
import subscriptionPlansRouter from '~/routes/subscription-plans'
import usersRouter from '~/routes/users'
import router from '~/routes/test'
import type { AppOpenAPI } from '~/types'

export function registerRoutes(app: AppOpenAPI) {
  return app
    .route(API_START_POINT, authRouter)
    .route(API_START_POINT, subscriptionPlansRouter)
    .route(API_START_POINT, usersRouter)
    .route(API_START_POINT, adminProfileRouter)
    .route(API_START_POINT, filesRouter)
    .route(API_START_POINT, patientProfileRouter)
    .route(API_START_POINT, familyMembersRouter)
    .route(API_START_POINT, patientSettingsRouter)
    .route(API_START_POINT, subscriptionsRouter)
    .route('/test', router)
}
