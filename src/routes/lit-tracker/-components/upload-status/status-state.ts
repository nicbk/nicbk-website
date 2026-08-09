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
): UploadStatusState {
  if (jobs.some((job) => job.status === 'failed')) {
    return 'failed'
  }
  if (jobs.length > 0) {
    return 'in-progress'
  }
  return 'synced'
}

/**
 * The indicator's accessible name.
 *
 * Each state says what it means in words, so the three are distinguishable
 * without seeing the icon or its color (WCAG 1.4.1). The synced string is also
 * the tooltip text the decided spec names.
 */
export function uploadStatusLabel(state: UploadStatusState): string {
  switch (state) {
    case 'synced':
      return 'All articles synced'
    case 'in-progress':
      return 'Uploads in progress'
    case 'failed':
      return 'Some uploads need attention'
  }
}
