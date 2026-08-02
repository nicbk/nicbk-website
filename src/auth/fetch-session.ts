import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getSession } from './auth'
import type { AuthSession } from './session'

/**
 * Resolves the current request's session from anywhere a route runs.
 *
 * `beforeLoad` and loaders run on the server for the initial request and in the
 * browser for client-side navigations, but the session may only ever be read on
 * the server — it means validating the cookie against the database, and the
 * secret and connection that requires must not exist in a browser bundle. A
 * server function is the seam for exactly that: the client half is an RPC call,
 * and the handler below is stripped from the client build entirely.
 *
 * Kept in its own module so the guard's decision logic (`require-auth.ts`) can
 * be imported and tested without dragging in the database client.
 */
export const fetchSession = createServerFn({ method: 'GET' }).handler(
  (): Promise<AuthSession> => getSession(getRequest()),
)
