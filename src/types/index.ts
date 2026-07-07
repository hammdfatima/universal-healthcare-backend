/* eslint-disable ts/no-explicit-any */
import type { OpenAPIHono, RouteConfig, RouteHandler, z } from '@hono/zod-openapi'
import type { Env } from 'hono'

import type { UserRole } from '~/config/roles'

export interface AppBindings {
  Variables: {
    user: IPayload | null
  }
}
export type AppOpenAPI = OpenAPIHono<AppBindings>
export type AppRouteHandler<R extends RouteConfig, A extends Env = AppBindings> = RouteHandler<R, A>
// eslint-disable-next-line ts/no-empty-object-type
export type AppMiddlewareVariables<T extends Record<string, unknown> = Record<string, never>> =
  AppBindings & {
    Variables: T
  }

export type ZodSchema =
  | z.ZodTypeAny
  | z.ZodUnion<z.ZodTypeAny[]>
  | z.ZodObject<Record<string, z.ZodTypeAny>>
  | z.ZodArray<z.ZodTypeAny>

export interface IPayload {
  user_id: string
  email: string
  role: UserRole
  tokenVersion?: number
}

export type HandlerMapFromRoutes<T extends Record<string, RouteConfig>> = {
  [K in keyof T]: AppRouteHandler<T[K]>
}
