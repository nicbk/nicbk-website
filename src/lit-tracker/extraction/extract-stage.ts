import { eq, sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'
import type { DatabaseHandle } from '~/db/create-database'
import { articles, uploadJobs } from '~/db/schema'
import {
  graduateEdgesCiting,
  writeBibliography,
} from '~/lit-tracker/citations/edges'
import { lookupKeyFor } from '~/lit-tracker/enrichment/client'
import type { EnrichJob, ExtractJob } from '~/lit-tracker/jobs/queue'
import { ENRICH_QUEUE } from '~/lit-tracker/jobs/queue'
import { PdfOwnershipError } from '~/storage/pdf-storage'
import { ExtractionFailedError } from './failure'
import type { ExtractionServices } from './services'
import type { ExtractedMetadata } from './tei'

/**
 * The stage that turns an upload into an article — and, when it succeeds, into
 * a node in the citation graph.
 *
 * ## It always creates the article row
 *
 * Success or failure. This is a decided requirement rather than a convenience:
 * the status popup's failed rows are meant to open in `article-edit` (#11), and
 * that only holds unconditionally if a failed job has an article behind it
 * (research/data-modeling/upload-jobs-schema.md). So a document GROBID could
 * not read still produces a row — titled with the filename the user uploaded,
 * with no authors — marked `extraction_status = 'failed'`.
 *
 * ## What counts as a failure
 *
 * A title and at least one author. Everything else a paper can genuinely lack:
 * a preprint has no venue, most conference papers carry no DOI, and an abstract
 * is often unrecoverable from a scan. A title and authors are what make the row
 * an article rather than a filename, and the decided fallbacks — filename for
 * the title, `[]` for the authors — exist precisely to fill them in when the
 * job is being marked failed.
 *
 * ## What is retried
 *
 * Nothing here decides that. A terminal outcome arrives as
 * `ExtractionFailedError` and is written; anything else propagates, and pg-boss
 * retries it. See failure.ts.
 */

/** The `upload_jobs` row this stage works from. */
interface UploadJobRow {
  filename: string
  pdfObjectKey: string
}

/**
 * Runs the extract stage for one job.
 *
 * Resolves when the job has reached a terminal outcome — article written, and
 * either finalize enqueued or the job marked failed. Rejects only for transient
 * failures, which is how it asks to be retried.
 */
export async function runExtractStage(
  job: ExtractJob,
  services: ExtractionServices,
): Promise<void> {
  const uploadJob = await loadUploadJob(services.database, job.uploadJobId)
  if (!uploadJob) {
    // The row is gone: the user's account was deleted, or #11 removed the
    // article and cascaded it away, while this job sat in the queue. There is
    // nothing left to record against, and re-creating it would resurrect data
    // the user asked to remove.
    console.warn(
      `Extract job ${job.uploadJobId} has no upload_jobs row; skipping.`,
    )
    return
  }

  let metadata: ExtractedMetadata
  try {
    const pdf = await services.fetchPdf(job.pdfObjectKey, job.userId)
    metadata = await services.extractMetadata(pdf)
  } catch (error) {
    const reason = terminalReasonFor(error)
    if (reason === null) {
      throw error
    }
    await recordOutcome(services, job, uploadJob, {
      kind: 'failed',
      reason,
      metadata: null,
    })
    return
  }

  const missing = missingRequiredFields(metadata)
  if (missing) {
    await recordOutcome(services, job, uploadJob, {
      kind: 'failed',
      reason: missing,
      // Everything that *did* parse is still written: an article the user has
      // to name is more use than an empty one.
      metadata,
    })
    return
  }

  await recordOutcome(services, job, uploadJob, { kind: 'extracted', metadata })
}

/**
 * Resolves a job whose retries pg-boss has exhausted.
 *
 * Runs on the dead-letter queue, and exists so "transient" cannot mean
 * "forever": a GROBID that stayed down past the backoff would otherwise leave
 * the row in `processing` with no article behind it, which is the one state the
 * status popup offers the user no way out of. The reason is deliberately about
 * the service rather than the file — nothing here suggests the PDF was bad.
 */
export async function runExhaustedExtractStage(
  job: ExtractJob,
  services: ExtractionServices,
): Promise<void> {
  const uploadJob = await loadUploadJob(services.database, job.uploadJobId)
  if (!uploadJob) {
    return
  }

  console.error(
    `Extraction gave up on upload job ${job.uploadJobId} after its retries were exhausted.`,
  )
  await recordOutcome(services, job, uploadJob, {
    kind: 'failed',
    reason: 'extraction kept failing — try uploading again',
    metadata: null,
  })
}

/**
 * The user-facing reason if this error is terminal, or `null` to retry.
 *
 * Two errors are terminal. `ExtractionFailedError` is the pipeline's own signal
 * and carries its own wording. A `PdfOwnershipError` means the job names an
 * object belonging to someone else — corrupt job data, not a service
 * failure — so retrying it would only repeat a refused read, and it is worth
 * resolving loudly rather than quietly retrying.
 */
function terminalReasonFor(error: unknown): string | null {
  if (error instanceof ExtractionFailedError) {
    return error.reason
  }
  if (error instanceof PdfOwnershipError) {
    console.error('Refusing to extract a PDF the job does not own:', error)
    return 'stored file could not be read'
  }
  return null
}

/**
 * Whether the metadata is enough to be an article, and what to tell the user if
 * not.
 *
 * "couldn't find authors" is the example
 * research/ui-ux/pages/lit-tracker/components/upload-status.md gives for a
 * failure reason, and this is where it is actually decided.
 */
function missingRequiredFields(metadata: ExtractedMetadata): string | null {
  const hasTitle = metadata.title !== null
  const hasAuthors = metadata.authors.length > 0

  if (!hasTitle && !hasAuthors) {
    return "couldn't find a title or authors"
  }
  if (!hasTitle) {
    return "couldn't find a title"
  }
  if (!hasAuthors) {
    return "couldn't find authors"
  }
  return null
}

/** How this job ended. */
type Outcome =
  | { kind: 'extracted'; metadata: ExtractedMetadata }
  | { kind: 'failed'; reason: string; metadata: ExtractedMetadata | null }

/**
 * Writes the outcome: the article, the job's new state, and — on success — the
 * next stage, all in one transaction.
 *
 * One transaction because these are one fact. A committed article whose job
 * still says `processing` would spin in the popup forever, and a finalize job
 * enqueued outside the transaction could delete the row before the article it
 * points at was committed.
 */
async function recordOutcome(
  services: ExtractionServices,
  job: ExtractJob,
  uploadJob: UploadJobRow,
  outcome: Outcome,
): Promise<void> {
  const metadata = outcome.metadata
  const extracted = {
    // The decided best-effort fallbacks. `title` is never null in the schema,
    // and a filename is at least something the user recognises.
    title: metadata?.title ?? uploadJob.filename,
    authors: metadata?.authors ?? [],
    abstract: metadata?.abstract ?? null,
    publicationYear: metadata?.publicationYear ?? null,
    venue: metadata?.venue ?? null,
    doi: metadata?.identifiers.doi ?? null,
    extractionStatus:
      outcome.kind === 'extracted'
        ? ('grobid_only' as const)
        : ('failed' as const),
  }

  await services.database.db.transaction(async (tx) => {
    await tx
      .insert(articles)
      .values({
        // The id the PDF was already stored under, so no object is ever moved
        // or copied (research/data-modeling/upload-jobs-schema.md).
        id: job.uploadJobId,
        userId: job.userId,
        pdfObjectKey: job.pdfObjectKey,
        ...extracted,
      })
      // A crash between this commit and pg-boss recording the job complete
      // replays the whole stage, so the insert has to be repeatable. Only the
      // extracted fields are overwritten — reading status and notes belong to
      // the user, not to extraction.
      .onConflictDoUpdate({
        target: articles.id,
        set: { ...extracted, updatedAt: new Date() },
      })

    await tx
      .update(uploadJobs)
      .set({
        articleId: job.uploadJobId,
        status: outcome.kind === 'extracted' ? 'processing' : 'failed',
        failureReason: outcome.kind === 'extracted' ? null : outcome.reason,
      })
      .where(eq(uploadJobs.id, job.uploadJobId))

    if (outcome.kind !== 'extracted') {
      // A failed job enqueues nothing: its row has to stay, because it is the
      // only thing telling the user this upload needs them. Its bibliography
      // is not written either — an article that could not be given a title is
      // not yet a citing node worth putting in the graph.
      return
    }

    // The bibliography is written here, in the transaction that creates the
    // article, rather than in the stage that enriches it. Enrichment reaches a
    // third party that is allowed to be unavailable; the references are already
    // in hand, and losing a paper's whole bibliography because a public API was
    // busy would be a much worse outcome than an unresolved edge.
    const edges = await writeBibliography(
      tx,
      { articleId: job.uploadJobId, userId: job.userId },
      outcome.metadata.bibliography,
    )

    // Direction two of the decided graduation rule, in its GROBID-only form:
    // edges that other articles have been carrying, unresolved, waiting for
    // this paper to be uploaded. Enrichment runs the same check again by
    // Semantic Scholar id once it has one.
    await graduateEdgesCiting(tx, {
      id: job.uploadJobId,
      userId: job.userId,
      semanticScholarId: null,
      title: extracted.title,
      authors: extracted.authors,
    })

    const enrich: EnrichJob = {
      uploadJobId: job.uploadJobId,
      userId: job.userId,
      articleId: job.uploadJobId,
      articleLookupKey: lookupKeyFor(outcome.metadata.identifiers),
      edgeLookups: edges.flatMap((edge) => {
        const key = lookupKeyFor(edge.identifiers)
        return key ? [{ edgeId: edge.id, key }] : []
      }),
    }
    await services.queue.send(ENRICH_QUEUE, enrich, {
      db: fromDrizzle(tx, sql),
    })
  })
}

async function loadUploadJob(
  { db }: DatabaseHandle,
  uploadJobId: string,
): Promise<UploadJobRow | undefined> {
  // Read rather than carried in the job payload: the filename is the fallback
  // title, and the row is the authority on it.
  return db.query.uploadJobs.findFirst({
    columns: { filename: true, pdfObjectKey: true },
    where: eq(uploadJobs.id, uploadJobId),
  })
}
