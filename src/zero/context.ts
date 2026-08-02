import type { AuthSession } from '~/auth/session'

/**
 * What a query or mutator is allowed to know about who is asking.
 *
 * Deliberately just the user id. Zero passes a query's *arguments* straight
 * through from the client, so anything a permission decision depends on has to
 * arrive by a path the client cannot touch — this one, derived on the server
 * from the session cookie. Widening it later is a decision about what queries
 * may branch on, which is why it is a named type rather than an inline object.
 */
export interface ZeroContext {
  /** The signed-in user's id, from the validated session. Never from the client. */
  id: string
}

/**
 * Registers `ZeroContext` as the context type for every `defineQuery` and
 * `defineMutator` in this app, so `ctx` is typed without threading generics
 * through each definition.
 *
 * `undefined` is part of the type on purpose: an unauthenticated request must
 * be *representable*, so that every query is written to handle it and the
 * compiler enforces that. See `queries.ts` for what they do with it.
 */
declare module '@rocicorp/zero' {
  interface DefaultTypes {
    context: ZeroContext | undefined
  }
}

/**
 * Turns a resolved Better Auth session into the context queries run under.
 *
 * The only function permitted to produce a `ZeroContext`. It reads nothing but
 * the session, which `getSessionFrom` has already validated against the
 * database — so no request body, header, or query argument can influence which
 * user's rows a query returns. That is the whole authorization model for user
 * data on this site: Zero has no row-level-security layer behind `/query`
 * (research/system-architecture/data-sharing-boundaries.md).
 *
 * Returns `undefined` for a signed-out, expired, or tampered-with session.
 */
export function zeroContextFrom(session: AuthSession): ZeroContext | undefined {
  if (!session) {
    return undefined
  }
  return { id: session.user.id }
}
