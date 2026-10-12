import { eq, sql } from 'drizzle-orm'
import type { PgBoss } from 'pg-boss'
import { fromDrizzle } from 'pg-boss'
import type { DatabaseHandle } from '~/db/create-database'
import { articleContents, articles } from '~/db/schema'
import { ExtractionFailedError } from '~/lit-tracker/extraction/failure'
import type { ExtractionServices } from '~/lit-tracker/extraction/services'
import { handleEach } from '~/lit-tracker/jobs/handle-batch'
import type { ContentsReadJob, JobQueue } from '~/lit-tracker/jobs/queue'
import {
  CONTENTS_READ_DEAD_LETTER_QUEUE,
  CONTENTS_READ_QUEUE,
} from '~/lit-tracker/jobs/queue'
import { PdfOwnershipError } from '~/storage/pdf-storage'
import { chooseContents } from './choose'
import type { ContentsEntry, ContentsSource } from './contents'
import { isUsableOutline } from './outline'

/**
 * Reading the contents of papers uploaded before the upload read them
 * (features/a-paper-shows-its-contents, task `older-papers-are-read-for-contents`).
 *
 * The same pattern as the reference re-read (`citations/reread-stage.ts`), with
 * one thing fewer: **no status table.** A paper needs reading exactly when it
 * has no contents row, and every outcome — contents found, none, a failure —
 * writes one. So the row's absence is the queue's whole state, and a paper that
 * gives up is recorded as `failed` rather than asked about again at every start.
 *
 * **Only the contents row is written.** The article, its bibliography and its
 * `updated_at` are not touched: reading contents is not editing the paper.
 */

/**
 * Queues a contents read for every finished paper without contents.
 *
 * Called when the worker starts. **Safe to call again**: the queue is
 * `exclusive` and keyed by the paper, so one still waiting is not given a second
 * job, and one that has been read has its row and is not selected. A paper still
 * being uploaded is left to its upload, which reads its contents anyway.
 *
 * Returns how many papers were queued.
 */
export async function queueContentsReads(
  database: DatabaseHandle,
  queue: JobQueue,
): Promise<number> {
  return database.db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ id: string; user_id: string }>(
      sql`
        select a.id, a.user_id
        from ${articles} a
        where a.extraction_status in ('grobid_only', 'enriched')
          and not exists (
            select 1 from ${articleContents} c where c.article_id = a.id
          )
          and not exists (
            select 1 from upload_jobs j where j.article_id = a.id
          )
      `,
    )
    for (const row of rows) {
      const job: ContentsReadJob = { articleId: row.id, userId: row.user_id }
      await queue.send(CONTENTS_READ_QUEUE, job, {
        singletonKey: job.articleId,
        db: fromDrizzle(tx, sql),
      })
    }
    return rows.length
  })
}

/**
 * Reads one paper's contents and writes them.
 *
 * **GROBID is asked only when it has to be.** The outline is read first, from
 * the stored PDF, by the server's own engine; only a paper without a usable one
 * is sent to GROBID for its numbered headings. Most papers with an outline —
 * and every book with one — cost no GROBID call at all.
 *
 * A GROBID that is down throws, and the job is retried; a GROBID that refuses
 * the paper outright leaves it with whatever the outline gave.
 */
export async function runContentsRead(
  job: ContentsReadJob,
  services: ExtractionServices,
): Promise<void> {
  const { db } = services.database
  const article = await db.query.articles.findFirst({
    columns: { pdfObjectKey: true, userId: true },
    where: eq(articles.id, job.articleId),
  })
  if (!article || article.userId !== job.userId) {
    // Deleted while the job waited, or not this user's: nothing to read for.
    return
  }

  let pdf: Uint8Array
  try {
    pdf = await services.fetchPdf(article.pdfObjectKey, job.userId)
  } catch (error) {
    if (error instanceof PdfOwnershipError) {
      console.error(`Reading contents for ${job.articleId} refused:`, error)
      await writeContents(services.database, job, {
        source: 'failed',
        entries: [],
      })
      return
    }
    throw error
  }

  let outline: ContentsEntry[] | null
  try {
    outline = await services.readOutline(pdf)
  } catch (error) {
    console.warn(`Could not read the outline of ${job.articleId}:`, error)
    outline = null
  }

  let headings: ContentsEntry[] = []
  if (!outline || !isUsableOutline(outline)) {
    try {
      headings = (await services.extractMetadata(pdf)).headings
    } catch (error) {
      if (!(error instanceof ExtractionFailedError)) {
        throw error
      }
      console.warn(`GROBID could not read ${job.articleId}:`, error)
    }
  }

  const chosen = chooseContents(outline, headings)
  await writeContents(
    services.database,
    job,
    outline === null && chosen.source === 'none'
      ? { source: 'failed', entries: [] }
      : chosen,
  )
}

/**
 * Records a paper whose read gave up, so the tab can say so and the next start
 * does not queue it again. Its row is the only trace; the paper is untouched.
 */
export async function runExhaustedContentsRead(
  job: ContentsReadJob,
  services: Pick<ExtractionServices, 'database'>,
): Promise<void> {
  console.error(
    `Reading contents for ${job.articleId} gave up after its retries.`,
  )
  await writeContents(services.database, job, { source: 'failed', entries: [] })
}

export async function registerContentsReadHandlers(
  boss: PgBoss,
  services: ExtractionServices,
): Promise<void> {
  await boss.work<ContentsReadJob>(CONTENTS_READ_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runContentsRead(job, services)),
  )
  await boss.work<ContentsReadJob>(CONTENTS_READ_DEAD_LETTER_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runExhaustedContentsRead(job, services)),
  )
}

/**
 * Writes the row, **never over one already there.** The upload pipeline may
 * have read this paper while the job waited — an article re-uploaded, or a
 * replayed extraction — and what it wrote is at least as current as this.
 */
async function writeContents(
  database: DatabaseHandle,
  job: ContentsReadJob,
  contents: { source: ContentsSource; entries: ContentsEntry[] },
): Promise<void> {
  await database.db
    .insert(articleContents)
    .values({ articleId: job.articleId, userId: job.userId, ...contents })
    .onConflictDoNothing({ target: articleContents.articleId })
}
