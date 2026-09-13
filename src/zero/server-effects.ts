import type { Transaction } from '@rocicorp/zero'
import { sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'
import { z } from 'zod'
import type { JobQueue, PdfCleanupJob } from '~/lit-tracker/jobs/queue'
import { PDF_CLEANUP_QUEUE } from '~/lit-tracker/jobs/queue'
import type { ZeroContext } from './context'
import { mutators } from './mutators'
import { requireSession } from './ownership'

/**
 * What a mutation does that the browser must not do.
 *
 * **Server-only. Never import this from a component or from `mutators.ts`.** It
 * reaches the job queue, which reaches Postgres and, through the handler it
 * enqueues, the object store's credentials.
 *
 * ## Why this file exists at all
 *
 * Every mutator on this site runs twice: optimistically in the browser against
 * the local copy, and authoritatively at `/api/zero/mutate`. Until #11 that cost
 * nothing, because every consequence of every write was a row in Postgres and
 * both copies could express it. Deleting an article is the first write with a
 * consequence outside the database — a PDF in Garage — and the browser copy has
 * no business having one.
 *
 * Zero does offer a way to write a server-only branch inside a shared mutator
 * (`tx.location === 'server'`, then `tx.dbTransaction.wrappedTransaction`), and
 * it is the documented pattern. It is the wrong one **here**, for a reason that
 * is about bundling rather than about Zero: the branch would still need
 * `import {fromDrizzle} from 'pg-boss'` at the top of `mutators.ts`, and that
 * module is imported by the browser bundle. A dead branch does not undo an
 * import. So the effect lives on this side of the seam instead, keyed by the
 * mutator it belongs to, and `mutators.ts` stays a module a browser can hold.
 *
 * ## It runs inside the mutation's own transaction
 *
 * `respondToZeroMutate` calls this from within `transact`, with the same
 * transaction the mutator just wrote through. pg-boss can send on a supplied
 * connection — the extraction pipeline already does this when one stage chains
 * the next — so the queue row and the deleted article commit together or not at
 * all. There is no window in which the row is gone and the cleanup was never
 * asked for, and a throw here rolls the mutation back rather than leaving it
 * half-done.
 */

/** What the endpoint knows about a mutation that has just run. */
export interface ServerEffectInput {
  /** The mutation's arguments, already validated by the mutator that ran. */
  args: unknown
  /**
   * The session-derived context. The only place an owner may come from.
   *
   * Optional for the same reason a mutator's is, and checked the same way: the
   * endpoint answers a sessionless request with 401 long before this, so an
   * absent context here should be impossible — `requireSession` is the guarantee
   * underneath that rather than a substitute for it.
   */
  ctx: ZeroContext | undefined
  /** The transaction the mutator wrote through. */
  tx: Transaction
  /**
   * Reaches the background-job queue, and is called only when there is
   * something to send. Almost every mutation on this site has no effect here, so
   * connecting before knowing that would put a queue in the path of setting a
   * reading status.
   */
  getQueue: () => Promise<JobQueue>
}

/** The same, with the queue actually in hand. */
type EffectInput = Omit<ServerEffectInput, 'getQueue'> & { queue: JobQueue }

type ServerEffect = (input: EffectInput) => Promise<void>

/**
 * Which mutators have a server-only follow-up, by name.
 *
 * Keyed off `mutatorName` rather than a string literal so renaming a mutator
 * moves its effect with it instead of silently detaching one — a detached effect
 * is a PDF that is never deleted, and nothing fails when it happens.
 */
const EFFECTS = new Map<string, ServerEffect>([
  [mutators.articles.delete.mutatorName, enqueuePdfCleanup],
])

/**
 * Runs whatever the named mutation owes the world outside Postgres.
 *
 * Most mutations owe nothing, and that is the common path: no entry, no work.
 */
export async function runServerEffect(
  name: string,
  { args, ctx, tx, getQueue }: ServerEffectInput,
): Promise<void> {
  const effect = EFFECTS.get(name)
  if (!effect) {
    return
  }
  await effect({ args, ctx, tx, queue: await getQueue() })
}

/** The id `articles.delete` was called with, read back rather than assumed. */
const DELETED_ARTICLE = z.object({ id: z.uuid() })

/**
 * Asks for the deleted article's PDF to be removed.
 *
 * The owner comes from `ctx`, exactly as it does in every mutator, and the job
 * carries the two ids rather than the object key — see `PdfCleanupJob` for why
 * deriving the key in the handler is what keeps a cleanup inside its own user's
 * prefix.
 */
// A function declaration rather than a `const`: `EFFECTS` above is built at
// module load and names this, and a `const` would not be initialized yet.
async function enqueuePdfCleanup({
  args,
  ctx,
  tx,
  queue,
}: EffectInput): Promise<void> {
  const job: PdfCleanupJob = {
    userId: requireSession(ctx).id,
    articleId: DELETED_ARTICLE.parse(args).id,
  }
  await queue.send(PDF_CLEANUP_QUEUE, job, {
    db: fromDrizzle(drizzleTransactionOf(tx), sql),
  })
}

/**
 * The Drizzle transaction underneath a Zero one.
 *
 * The narrowing is real rather than ceremonial: `Transaction` covers the client
 * copy too, and only the server's carries a database handle. Reaching this with
 * a client transaction would mean this module had been imported somewhere it
 * must never be, which is worth a throw rather than a type assertion.
 */
function drizzleTransactionOf(tx: Transaction) {
  if (tx.location !== 'server') {
    throw new Error('A server effect ran outside the server.')
  }
  return tx.dbTransaction.wrappedTransaction
}
