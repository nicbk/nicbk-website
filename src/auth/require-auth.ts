import { redirect } from '@tanstack/react-router'
import { fetchSession } from './fetch-session'
import { DEFAULT_RETURN_TO, sanitizeReturnTo } from './return-to'
import type { AuthSession } from './session'

/** A session that is definitely present — what a protected route is handed. */
export type SignedInSession = NonNullable<AuthSession>

/** The slice of a route's `beforeLoad` argument this guard actually reads. */
export interface GuardedLocation {
  /** The path (plus search and hash) the user asked for. */
  href: string
}

/**
 * The guard's decision, as a pure function over a session and a destination.
 *
 * Signed in: hand the session back, so the route gets the user it is about to
 * render for without asking twice. Signed out: throw a redirect to `/sign-in`
 * carrying where they were headed, so they land there afterwards instead of on
 * some fixed page (research/ui-ux/pages/site-wide/pages/sign-in.md). There is
 * deliberately no "access denied" interstitial — being signed out is not an
 * error, it is a step that hasn't happened yet.
 *
 * The requested href is sanitized rather than trusted: it reaches the sign-in
 * page as a search param, and `sanitizeReturnTo` is what keeps that from
 * becoming an open redirect.
 */
export function requireSession(
  session: AuthSession,
  requested: GuardedLocation,
): SignedInSession {
  if (session) {
    return session
  }

  const returnTo = sanitizeReturnTo(requested.href)
  throw redirect({
    to: '/sign-in',
    // The home page is where sign-in sends people anyway, so saying so in the
    // URL would only add noise — leave the param off and let the default win.
    search: returnTo === DEFAULT_RETURN_TO ? {} : { returnTo },
  })
}

/**
 * The drop-in route guard: resolves the session for the current request, then
 * applies {@link requireSession}.
 *
 * Meant to be used unchanged as a route's `beforeLoad`. Attaching it to a group
 * layout rather than to each page is what makes it cover routes added later:
 *
 * ```ts
 * export const Route = createFileRoute('/lit-tracker')({
 *   beforeLoad: async (context) => ({ auth: await requireAuth(context) }),
 *   component: LitTrackerLayout,
 * })
 * ```
 *
 * That is its one live caller today, and every `/lit-tracker` page inherits it
 * from there.
 */
export async function requireAuth({
  location,
}: {
  location: GuardedLocation
}): Promise<SignedInSession> {
  return requireSession(await fetchSession(), location)
}
