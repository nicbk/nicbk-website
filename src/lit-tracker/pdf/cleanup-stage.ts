import type { PgBoss } from 'pg-boss'
import { handleEach } from '~/lit-tracker/jobs/handle-batch'
import type { PdfCleanupJob } from '~/lit-tracker/jobs/queue'
import { PDF_CLEANUP_QUEUE } from '~/lit-tracker/jobs/queue'
import { pdfObjectKey } from '~/storage/object-key'
import { deleteArticlePdf } from '~/storage/pdf-storage'

/**
 * The last thing that happens when an article is deleted: its PDF leaves the
 * bucket.
 *
 * **Why this is a job and not a line in the mutator.** `articles.delete` is a
 * Zero mutator, and every mutator on this site runs twice — optimistically in
 * the browser, authoritatively at `/api/zero/mutate`. The browser copy must not
 * so much as *import* the storage client, which holds the bucket credentials
 * (research/security-privacy/pdf-and-annotation-data-protection.md). So the row
 * is deleted by the shared mutator and the object by this, enqueued by the
 * server half alone (`~/zero/server-effects.ts`).
 *
 * **Why deleting the row first is the right order.** The two cannot be made
 * atomic — Postgres and Garage are different systems — so one of them fails
 * first, and the question is which residue is acceptable. A row with no object
 * is an article whose PDF will not open: broken, visible, and unfixable by the
 * reader. An object with no row is a few megabytes nobody can reach. The
 * enqueue itself *is* in the row's transaction (pg-boss can send on a supplied
 * connection), so the only way to reach that second state is for the cleanup to
 * exhaust its retries with the queue row committed — loudly, in pg-boss's
 * failed-job table, rather than silently.
 */

/** What the cleanup reaches outside itself. One function, injected to be faked. */
export interface PdfCleanupServices {
  /** Removes a stored PDF, refusing keys the named user does not own. */
  deletePdf: (key: string, userId: string) => Promise<void>
}

/** The real thing, for the worker. */
export function productionPdfCleanupServices(): PdfCleanupServices {
  return { deletePdf: deleteArticlePdf }
}

/**
 * Runs the cleanup for one deleted article.
 *
 * The key is **derived** from the job's two fields rather than carried in the
 * payload — see `PdfCleanupJob` for why that is a security property and not a
 * convenience.
 *
 * Idempotent, and it has to be: pg-boss retries, so this runs again after any
 * partial failure and must treat an object that is already gone as done.
 * `deleteArticlePdf` is where that actually holds.
 */
export async function runPdfCleanupStage(
  job: PdfCleanupJob,
  services: PdfCleanupServices,
): Promise<void> {
  await services.deletePdf(pdfObjectKey(job.userId, job.articleId), job.userId)
}

/** Binds the cleanup to its queue. */
export async function registerPdfCleanupHandler(
  boss: PgBoss,
  services: PdfCleanupServices,
): Promise<void> {
  await boss.work<PdfCleanupJob>(PDF_CLEANUP_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runPdfCleanupStage(job, services)),
  )
}
