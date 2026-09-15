/**
 * Which of the three states the upload indicator is in
 * (research/ui-ux/pages/lit-tracker/components/upload-status.md).
 *
 * Derived from the live `upload_jobs` rows rather than tracked separately: the
 * list only ever holds jobs still needing attention, because a resolved job's
 * row is deleted rather than marked. So "nothing to show" and "nothing in
 * flight" are the same condition, and there is no history to filter out.
 *
 * Pure, and separate from the component, because the mapping is the part with
 * rules worth testing — precedence between a failure and work in progress, and
 * what an empty list means.
 */

/**
 * The minimum a job row needs to expose for the indicator to classify it.
 *
 * `status` is nullable because Zero types every synced column that way, not
 * because the column is: `upload_jobs.status` is `NOT NULL` with a default of
 * `'processing'`. A null is therefore treated as processing below — the only
 * reading consistent with the schema.
 */
export interface JobStatusRow {
  readonly status: string | null
}

/**
 * A re-read of an older paper's references, as synced
 * (features/citation-graph-traversal, task `older-papers-are-re-read`).
 * Nullable status for the same reason as a job's.
 */
export interface ReferenceReadRow {
  readonly articleId: string
  readonly status: string | null
}

/** A batch of re-reads, counted the way the list shows it. */
export interface ReferenceReadSummary {
  /** Papers finished — the "7" in "7 of 12". */
  done: number
  /** Every paper in the batch, finished or not. */
  total: number
  /** Papers still waiting or being read. */
  queued: number
  /** The papers whose re-read failed — what try again names. */
  failedArticleIds: string[]
}

/**
 * Counts a batch of re-reads.
 *
 * Finished rows stay until the whole batch is, which is what lets this say
 * "of 12" at all; a null status reads as queued, as a job's reads as processing.
 */
export function referenceReadSummary(
  reads: readonly ReferenceReadRow[],
): ReferenceReadSummary {
  const failedArticleIds = reads
    .filter((read) => read.status === 'failed')
    .map((read) => read.articleId)
  const done = reads.filter((read) => read.status === 'done').length
  return {
    done,
    total: reads.length,
    queued: reads.length - done - failedArticleIds.length,
    failedArticleIds,
  }
}

export type UploadStatusState =
  /** Nothing in flight and nothing failed: the non-clickable checkmark. */
  | 'synced'
  /** At least one upload still being processed. */
  | 'in-progress'
  /** At least one upload failed and has not been resolved. */
  | 'failed'

/**
 * Classifies the current set of unresolved jobs.
 *
 * **A failure outranks work in progress.** A failed upload needs the user, and
 * further uploads finishing does not make that less true — showing the
 * in-progress icon while something is broken would hide the one state that asks
 * for attention until the queue happened to drain.
 */
export function uploadStatusState(
  jobs: readonly JobStatusRow[],
  reads: ReferenceReadSummary = EMPTY_READS,
): UploadStatusState {
  if (
    jobs.some((job) => job.status === 'failed') ||
    reads.failedArticleIds.length > 0
  ) {
    return 'failed'
  }
  if (jobs.length > 0 || reads.queued > 0) {
    return 'in-progress'
  }
  return 'synced'
}

/** No re-reads at all: the state of every collection once a batch is done. */
export const EMPTY_READS: ReferenceReadSummary = {
  done: 0,
  total: 0,
  queued: 0,
  failedArticleIds: [],
}

/**
 * The indicator's accessible name.
 *
 * Each state says what it means in words, so the three are distinguishable
 * without seeing the icon or its color (WCAG 1.4.1). The synced string is also
 * the tooltip text the decided spec names.
 */
export function uploadStatusLabel(
  state: UploadStatusState,
  jobs: readonly JobStatusRow[] = [],
): string {
  // With no upload behind the state, the work is a re-read, and calling it an
  // upload would name something the reader never did.
  const rereadsOnly = jobs.length === 0
  switch (state) {
    case 'synced':
      return 'All articles synced'
    case 'in-progress':
      return rereadsOnly ? 'Re-reading references' : 'Uploads in progress'
    case 'failed':
      return jobs.some((job) => job.status === 'failed')
        ? 'Some uploads need attention'
        : 'Some references could not be re-read'
  }
}
