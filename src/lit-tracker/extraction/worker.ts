import type { PgBoss } from 'pg-boss'
import { handleEach } from '~/lit-tracker/jobs/handle-batch'
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
} from '~/lit-tracker/jobs/queue'
import { runEnrichStage, runExhaustedEnrichStage } from './enrich-stage'
import { runExhaustedExtractStage, runExtractStage } from './extract-stage'
import { runFinalizeStage } from './finalize-stage'
import type { ExtractionServices } from './services'

/**
 * The end of the extraction pipeline that actually runs: pg-boss handlers bound
 * to the extraction stages.
 *
 * Starting a worker at all, and keeping it connected, is
 * `~/lit-tracker/jobs/worker.ts`'s job — this file answers only which queue runs
 * which stage. The two were one file until #11 added a queue that is not part of
 * this pipeline, at which point "the worker" and "extraction's wiring" stopped
 * being the same thing.
 */

/**
 * Binds every stage to its queue.
 *
 * Separate from the retry loop that calls it so the wiring — which queue runs
 * which stage — can be asserted without a database, and so a test never inherits
 * an endless loop.
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
