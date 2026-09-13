import type { Transaction } from '@rocicorp/zero'
import { mustGetMutator } from '@rocicorp/zero'
import { handleMutateRequest } from '@rocicorp/zero/server'
import type { AuthSession } from '~/auth/session'
import type { JobQueue } from '~/lit-tracker/jobs/queue'
import { hasValidApiKey } from './api-key'
import type { ZeroContext } from './context'
import { zeroContextFrom } from './context'
import type { dbProvider } from './db-provider'
import { mutators } from './mutators'
import { runServerEffect } from './server-effects'

/** What the mutate endpoint needs from the application to answer a request. */
export interface ZeroMutateEndpointDependencies {
  /** The key zero-cache is configured to present. */
  apiKey: string
  /** Resolves the session for a request, validated against the database. */
  getSession: (request: Request) => Promise<AuthSession>
  /** Runs mutators inside a Postgres transaction. */
  dbProvider: typeof dbProvider
  /**
   * The background-job queue, for the writes whose consequences are not all in
   * Postgres — see `server-effects.ts`.
   *
   * Connected on demand rather than held, because the overwhelming majority of
   * mutations never need it, and a queue reached per request is a queue a test
   * can replace.
   */
  getQueue: () => Promise<JobQueue>
}

/**
 * The write half of the same boundary, and now a real one: every client write on
 * this site is a request that arrives here.
 *
 * Two checks stand in front of every mutator, and they answer different
 * questions. The API key proves the request came from zero-cache rather than
 * from the open internet; the session proves *who* is asking, and is the only
 * thing a mutator is allowed to derive ownership from. Neither substitutes for
 * the other, and neither substitutes for the per-row ownership checks in
 * `ownership.ts` — a valid session for user A says nothing about whether the row
 * id in the arguments belongs to A.
 *
 * `#7` stood this endpoint up against an empty registry so the seam would be
 * proven closed before it had a consumer. `#8`'s second task is that consumer.
 */
export async function respondToZeroMutate(
  request: Request,
  { apiKey, getSession, dbProvider, getQueue }: ZeroMutateEndpointDependencies,
): Promise<Response> {
  if (!hasValidApiKey(request, apiKey)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session = await getSession(request)
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Derived here, once, from the session this request already proved — never
  // from the request body, which is entirely under the client's control. This is
  // the same function `/query` calls, so a read and a write in the same session
  // cannot disagree about who is asking.
  const ctx = zeroContextFrom(session)

  const result = await handleMutateRequest({
    dbProvider,
    // Everything inside `transact` runs in one Postgres transaction: a mutator
    // that throws — including from an ownership check — rolls back whatever it
    // had already written, which is what "fails and leaves no row" means.
    handler: (transact) =>
      transact((tx, name, args) =>
        runMutation({ ctx, getQueue }, tx, name, args),
      ),
    request,
    userID: session.user.id,
  })

  return Response.json(result)
}

/**
 * One mutation, as this application performs it: the mutator, then whatever
 * that mutator owes the world outside Postgres.
 *
 * Named and exported rather than written inline in the handler above, because
 * the **order and the shared transaction are the design** and neither is
 * visible in a closure. An effect runs *after* its mutator, so it is a
 * consequence of a write that succeeded; it runs on the *same* `tx`, so a throw
 * from it rolls that write back rather than leaving a row deleted and its
 * follow-up never asked for. Both are assertable here without a database.
 *
 * `mustGetMutator` throws on a name the registry does not hold, which is what
 * makes an invented mutator name a failure rather than a silent no-op.
 */
export async function runMutation(
  {
    ctx,
    getQueue,
  }: {
    ctx: ZeroContext | undefined
    getQueue: () => Promise<JobQueue>
  },
  tx: Transaction,
  name: string,
  args: unknown,
): Promise<void> {
  await mustGetMutator(mutators, name).fn({ args, tx, ctx } as never)
  await runServerEffect(name, { args, ctx, tx, getQueue })
}
