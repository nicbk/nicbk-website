import { db, pool } from '~/db/client'
import { productionServices } from '~/lit-tracker/extraction/services'
import { registerExtractionHandlers } from '~/lit-tracker/extraction/worker'
import {
  productionPdfCleanupServices,
  registerPdfCleanupHandler,
} from '~/lit-tracker/pdf/cleanup-stage'
import { getQueue } from './queue'

/**
 * The app server's background-job worker: everything that drains a queue, bound
 * and kept connected.
 *
 * **In the app server's own process**, per
 * research/system-architecture/service-topology.md, which puts orchestration in
 * the app server rather than in a service of its own. The process is already
 * long-lived and already holds the database pool.
 *
 * It lives beside `queue.ts` rather than inside `extraction/` for the reason
 * that module gives for itself: more than one part of this feature has jobs now,
 * and neither owns the worker. #11's PDF cleanup is not a stage of the
 * extraction pipeline — it runs once, at the far end of an article's life — so
 * registering it from a file called `extraction/worker.ts` would have been a
 * name that lied. Each pipeline still owns its own wiring; this owns only the
 * fact that they are started, once, together, and kept trying.
 */

let starting: Promise<void> | null = null

/**
 * Starts draining every queue, retrying until it can.
 *
 * Called for its side effect from the server entry, and deliberately does not
 * block startup: a database that is not up yet must not stop the site from
 * serving pages that do not need one. It also must not give up, because a
 * worker that quietly stopped after one failed connection would look exactly
 * like a working one, right up until an upload never resolved.
 */
export function startJobWorker(): Promise<void> {
  starting ??= registerUntilConnected()
  return starting
}

/** First retry delay, doubling up to the cap below. */
const FIRST_RETRY_MS = 5_000
const MAX_RETRY_MS = 60_000

async function registerUntilConnected(): Promise<void> {
  let delay = FIRST_RETRY_MS
  let attempt = 0
  for (;;) {
    try {
      const boss = await getQueue()
      await registerExtractionHandlers(
        boss,
        productionServices({ db, pool }, boss),
      )
      await registerPdfCleanupHandler(boss, productionPdfCleanupServices())
      if (attempt > 0) {
        console.log('Job worker connected.')
      }
      return
    } catch (error) {
      attempt += 1
      // The first failure gets the whole error, because that is the one worth
      // reading. Every retry after it is the same failure again, and printing a
      // stack trace every few seconds buries the log of a server that is
      // otherwise working — which is exactly the state a placeholder database
      // leaves the e2e tiers in.
      const detail = attempt === 1 ? error : summarize(error)
      console.error(
        `Job worker could not start; retrying in ${delay / 1000}s.`,
        detail,
      )
      await sleep(delay)
      delay = Math.min(delay * 2, MAX_RETRY_MS)
    }
  }
}

/** One line naming the failure, for a repeat of something already logged. */
function summarize(error: unknown): string {
  if (error instanceof Error) {
    // Connection errors carry their reason in `code` and often have an empty
    // message (`AggregateError [ECONNREFUSED]`), so the code comes first.
    const code = (error as { code?: unknown }).code
    return typeof code === 'string' ? code : error.message || error.name
  }
  return String(error)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
