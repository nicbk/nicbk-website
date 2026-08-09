import type { Job, PgBoss } from 'pg-boss'
import { db, pool } from '~/db/client'
import type {
  EnrichJob,
  ExtractJob,
  FinalizeJob,
} from '~/lit-tracker/jobs/queue'
import {
  ENRICH_DEAD_LETTER_QUEUE,
  ENRICH_QUEUE,
  EXTRACT_DEAD_LETTER_QUEUE,
  EXTRACT_QUEUE,
  FINALIZE_QUEUE,
  getQueue,
} from '~/lit-tracker/jobs/queue'
import { runEnrichStage, runExhaustedEnrichStage } from './enrich-stage'
import { runExhaustedExtractStage, runExtractStage } from './extract-stage'
import { runFinalizeStage } from './finalize-stage'
import type { ExtractionServices } from './services'
import { productionServices } from './services'

/**
 * The end of the pipeline that actually runs: pg-boss handlers bound to the
 * extraction stages.
 *
 * **In the app server's own process**, per
 * research/system-architecture/service-topology.md, which puts orchestration of
 * this pipeline in the app server rather than in a service of its own. The
 * process is already long-lived and already holds the database pool, and the
 * work is one blocking HTTP call to GROBID per PDF at personal-collection
 * volume.
 */

let starting: Promise<void> | null = null

/**
 * Starts draining the queues, retrying until it can.
 *
 * Called for its side effect from the server entry, and deliberately does not
 * block startup: a database that is not up yet must not stop the site from
 * serving pages that do not need one. It also must not give up, because a
 * worker that quietly stopped after one failed connection would look exactly
 * like a working one, right up until an upload never resolved.
 */
export function startExtractionWorker(): Promise<void> {
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
      if (attempt > 0) {
        console.log('Extraction worker connected.')
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
        `Extraction worker could not start; retrying in ${delay / 1000}s.`,
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

/**
 * Binds every stage to its queue.
 *
 * Separate from the retry loop above so the wiring — which queue runs which
 * stage — can be asserted without a database, and so a test never inherits an
 * endless loop.
 */
export async function registerExtractionHandlers(
  boss: PgBoss,
  services: ExtractionServices,
): Promise<void> {
  await boss.work<ExtractJob>(EXTRACT_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runExtractStage(job, services)),
  )
  await boss.work<ExtractJob>(EXTRACT_DEAD_LETTER_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runExhaustedExtractStage(job, services)),
  )
  await boss.work<EnrichJob>(ENRICH_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runEnrichStage(job, services)),
  )
  await boss.work<EnrichJob>(ENRICH_DEAD_LETTER_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runExhaustedEnrichStage(job, services)),
  )
  await boss.work<FinalizeJob>(FINALIZE_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runFinalizeStage(job, services)),
  )
}

/**
 * Runs one stage over a fetched batch.
 *
 * pg-boss hands a worker an array even at the default batch size of one, and
 * settles the whole batch together — so these run in sequence rather than
 * concurrently, and a throw stops the rest. That is the behaviour this pipeline
 * wants: throwing is how a stage asks to be retried, and it must not be
 * ambiguous which jobs that covers.
 */
async function handleEach<T>(
  jobs: Job<T>[],
  run: (data: T) => Promise<void>,
): Promise<void> {
  for (const job of jobs) {
    await run(job.data)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
