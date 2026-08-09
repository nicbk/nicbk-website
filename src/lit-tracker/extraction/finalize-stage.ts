import { eq } from 'drizzle-orm'
import { uploadJobs } from '~/db/schema'
import type { FinalizeJob } from '~/lit-tracker/jobs/queue'
import type { ExtractionServices } from './services'

/**
 * The last stage: the job row goes away.
 *
 * Deleting rather than marking complete is the decided row lifecycle
 * (research/data-modeling/upload-jobs-schema.md). The status popup lists
 * `upload_jobs` directly, so a resolved job simply stops existing and the list
 * empties itself — there is no `completed` state for every query to filter back
 * out, and no history of finished uploads accumulating in front of the ones
 * that still need attention. The article it produced is what remains.
 *
 * A separate stage rather than the last line of `extract` because the decided
 * pipeline is one job per stage: task 5 inserts enrichment between the two, and
 * an enrichment that fails must leave the article standing and still finalize.
 */
export async function runFinalizeStage(
  job: FinalizeJob,
  services: ExtractionServices,
): Promise<void> {
  // Unconditional, and by primary key: this job is only ever sent by a stage
  // that has already committed its article, so there is nothing left to check.
  // Deleting a row that is already gone is a no-op, which is what makes the
  // stage safe to replay.
  await services.database.db
    .delete(uploadJobs)
    .where(eq(uploadJobs.id, job.uploadJobId))
}
