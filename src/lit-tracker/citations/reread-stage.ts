import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { PgBoss } from 'pg-boss'
import { fromDrizzle } from 'pg-boss'
import type { DatabaseHandle, DatabaseTransaction } from '~/db/create-database'
import { articles, citationEdges, referenceReads } from '~/db/schema'
import type { SemanticScholarPaper } from '~/lit-tracker/enrichment/client'
import { lookupKeyFor } from '~/lit-tracker/enrichment/client'
import { referenceCountOf } from '~/lit-tracker/enrichment/metadata'
import { alignReferences } from '~/lit-tracker/enrichment/reference-list'
import { ExtractionFailedError } from '~/lit-tracker/extraction/failure'
import type { ExtractionServices } from '~/lit-tracker/extraction/services'
import type { ExtractedMetadata } from '~/lit-tracker/extraction/tei'
import { handleEach } from '~/lit-tracker/jobs/handle-batch'
import type { JobQueue, ReferenceRereadJob } from '~/lit-tracker/jobs/queue'
import {
  REFERENCE_REREAD_DEAD_LETTER_QUEUE,
  REFERENCE_REREAD_QUEUE,
} from '~/lit-tracker/jobs/queue'
import { PdfOwnershipError } from '~/storage/pdf-storage'
import {
  addReferenceEdges,
  applyResolvedEdges,
  dropMergedRows,
  writeBibliography,
} from './edges'

/**
 * Reading an older paper's bibliography again, so it gains what new uploads
 * get: each reference as printed, Semantic Scholar's reference count, and the
 * merged-row rule (features/citation-graph-traversal, task
 * `older-papers-are-re-read`).
 *
 * ## Not extraction run again
 *
 * Extraction writes the article's title, authors, year, venue, DOI and
 * abstract, and a reader may have corrected any of them (#11). This reads the
 * stored PDF and rewrites **only the bibliography** — plus the reference count
 * and the read marker, which nothing else writes. `updated_at` is left as it
 * was: re-reading references is not editing the article.
 *
 * ## Nothing is lost when it fails
 *
 * Every network call — GROBID, then Semantic Scholar — happens before anything
 * is written, and the bibliography is replaced in one transaction afterwards.
 * So a GROBID that is down, or a Semantic Scholar that throttles, leaves the
 * paper exactly as it was: retried, and in the end shown as failed with its old
 * references intact. Writing the parse first and resolving it after would put a
 * 97%-resolved graph back to GROBID's 13% for as long as the API stayed away.
 */

/**
 * Queues a re-read for every finished paper read before printed text was kept.
 *
 * Called when the worker starts. **Safe to call again**: a paper that already
 * has a `reference_reads` row is not added twice, and a failed paper waits for
 * its try again rather than being retried behind the reader's back. A paper
 * still being uploaded is left to its upload, which reads its bibliography
 * anyway.
 *
 * **Every `queued` row is sent a job, not only the new ones.** A row whose job
 * was lost — the queue recreated, a job purged — would otherwise count as
 * waiting forever, and the countdown would never finish; found on the local
 * stack, where the queue predated its policy. Re-sending is harmless: the queue
 * is `exclusive` and each job is keyed by its paper, so a paper whose job is
 * still waiting is not given a second.
 *
 * The rows and their jobs commit together. Returns how many papers were newly
 * queued.
 */
export async function queueReferenceRereads(
  database: DatabaseHandle,
  queue: JobQueue,
): Promise<number> {
  return database.db.transaction(async (tx) => {
    const { rows } = await tx.execute<{ article_id: string }>(
      sql`
        insert into ${referenceReads} (article_id, user_id, status)
        select a.id, a.user_id, 'queued'
        from ${articles} a
        where a.references_read_at is null
          and a.extraction_status in ('grobid_only', 'enriched')
          and not exists (
            select 1 from upload_jobs j where j.article_id = a.id
          )
        on conflict (article_id) do nothing
        returning article_id
      `,
    )
    const waiting = await tx
      .select({
        article_id: referenceReads.articleId,
        user_id: referenceReads.userId,
      })
      .from(referenceReads)
      .where(eq(referenceReads.status, 'queued'))
    for (const row of waiting) {
      const job: ReferenceRereadJob = {
        articleId: row.article_id,
        userId: row.user_id,
      }
      await queue.send(REFERENCE_REREAD_QUEUE, job, {
        singletonKey: job.articleId,
        db: fromDrizzle(tx, sql),
      })
    }
    return rows.length
  })
}

/** Runs one re-read. Throws only to ask to be retried. */
export async function runReferenceReread(
  job: ReferenceRereadJob,
  services: ExtractionServices,
): Promise<void> {
  const article = await services.database.db.query.articles.findFirst({
    columns: { pdfObjectKey: true, semanticScholarId: true, userId: true },
    where: eq(articles.id, job.articleId),
  })
  if (!article || article.userId !== job.userId) {
    // Deleted while queued: its row went with it, by cascade.
    return
  }

  let metadata: ExtractedMetadata
  try {
    const pdf = await services.fetchPdf(article.pdfObjectKey, job.userId)
    metadata = await services.extractMetadata(pdf)
  } catch (error) {
    if (
      error instanceof ExtractionFailedError ||
      error instanceof PdfOwnershipError
    ) {
      // Not something a retry changes: GROBID read the file and found nothing,
      // or the job names a file this user does not own.
      console.error(`Re-reading references for ${job.articleId} failed:`, error)
      await markFailed(services.database, job.articleId)
      return
    }
    throw error
  }

  const edgeKeys = metadata.bibliography.flatMap((entry) => {
    const key = lookupKeyFor(entry.identifiers)
    return key ? [key] : []
  })
  const articleKey = article.semanticScholarId
  const papers = await services.lookupPapers([
    ...(articleKey ? [articleKey] : []),
    ...edgeKeys,
  ])
  const candidates = articleKey
    ? await services.fetchReferences(articleKey)
    : []
  const paper = articleKey ? papers.get(articleKey) : undefined

  await services.database.db.transaction(async (tx) => {
    const citing = { articleId: job.articleId, userId: job.userId }
    const edges = await writeBibliography(tx, citing, metadata.bibliography)

    const resolved = edges.flatMap((edge) => {
      const key = lookupKeyFor(edge.identifiers)
      const found = key ? papers.get(key) : undefined
      return found ? [resolvedEdge(edge.id, found)] : []
    })
    const alignment = alignReferences(
      await unresolvedEdges(tx, job.articleId, resolved),
      candidates,
      resolved.map((edge) => edge.semanticScholarId),
    )

    await applyResolvedEdges(tx, citing, [
      ...resolved,
      ...alignment.matched.map((entry) =>
        resolvedEdge(entry.edgeId, entry.paper),
      ),
    ])
    await addReferenceEdges(tx, citing, alignment.unclaimed)
    await dropMergedRows(tx, job.articleId)

    await tx
      .update(articles)
      .set({
        referencesReadAt: new Date(),
        ...(paper ? { referenceCount: referenceCountOf(paper) } : {}),
        // Written to itself so Drizzle's `$onUpdate` does not stamp it: this is
        // not an edit of the article.
        updatedAt: sql`${articles.updatedAt}`,
      })
      .where(eq(articles.id, job.articleId))

    await markDone(tx, job.articleId, job.userId)
  })
}

/** Marks a re-read failed once pg-boss has exhausted its retries. */
export async function runExhaustedReferenceReread(
  job: ReferenceRereadJob,
  services: Pick<ExtractionServices, 'database'>,
): Promise<void> {
  console.error(
    `Re-reading references for ${job.articleId} gave up after its retries.`,
  )
  await markFailed(services.database, job.articleId)
}

/** Binds the re-read and its dead letter to their queues. */
export async function registerReferenceRereadHandlers(
  boss: PgBoss,
  services: ExtractionServices,
): Promise<void> {
  await boss.work<ReferenceRereadJob>(REFERENCE_REREAD_QUEUE, (jobs) =>
    handleEach(jobs, (job) => runReferenceReread(job, services)),
  )
  await boss.work<ReferenceRereadJob>(
    REFERENCE_REREAD_DEAD_LETTER_QUEUE,
    (jobs) =>
      handleEach(jobs, (job) => runExhaustedReferenceReread(job, services)),
  )
}

function resolvedEdge(
  edgeId: string,
  paper: Pick<SemanticScholarPaper, 'paperId' | 'title' | 'authors' | 'year'>,
) {
  return {
    edgeId,
    semanticScholarId: paper.paperId,
    paper: { title: paper.title, authors: paper.authors, year: paper.year },
  }
}

/** The edges just written that no printed identifier resolved. */
async function unresolvedEdges(
  tx: DatabaseTransaction,
  articleId: string,
  resolved: { edgeId: string }[],
): Promise<{ edgeId: string; title: string }[]> {
  const claimed = new Set(resolved.map((edge) => edge.edgeId))
  const rows = await tx
    .select({ id: citationEdges.id, title: citationEdges.title })
    .from(citationEdges)
    .where(
      and(
        eq(citationEdges.citingArticleId, articleId),
        isNull(citationEdges.semanticScholarId),
      ),
    )
  return rows
    .filter((row) => !claimed.has(row.id))
    .map((row) => ({ edgeId: row.id, title: row.title }))
}

/**
 * Marks this paper done, and clears the batch once nothing is left to show.
 *
 * Done rows are kept while anything is still queued or failed — they are the
 * "7" in "7 of 12" — and all go together once neither remains, which is what
 * returns the indicator to "All articles synced".
 */
async function markDone(
  tx: DatabaseTransaction,
  articleId: string,
  userId: string,
): Promise<void> {
  await tx
    .update(referenceReads)
    .set({ status: 'done' })
    .where(eq(referenceReads.articleId, articleId))

  const outstanding = await tx
    .select({ articleId: referenceReads.articleId })
    .from(referenceReads)
    .where(
      and(
        eq(referenceReads.userId, userId),
        inArray(referenceReads.status, ['queued', 'failed']),
      ),
    )
    .limit(1)
  if (outstanding.length === 0) {
    await tx.delete(referenceReads).where(eq(referenceReads.userId, userId))
  }
}

async function markFailed(
  database: DatabaseHandle,
  articleId: string,
): Promise<void> {
  await database.db
    .update(referenceReads)
    .set({ status: 'failed' })
    .where(eq(referenceReads.articleId, articleId))
}
