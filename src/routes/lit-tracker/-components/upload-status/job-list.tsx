import { AlertTriangle } from 'lucide-react'
import styles from './upload-status.module.css'

/**
 * The columns of `upload_jobs` this list renders.
 *
 * Shaped to accept a synced row as-is: Zero yields rows `readonly`, and types
 * every column nullable regardless of the database's `NOT NULL`, so widening
 * here is what lets a live row be passed straight in without a cast that would
 * quietly outlive the schema it was written against.
 */
export interface UploadJobRow {
  readonly id: string
  readonly filename: string
  readonly status: string | null
  readonly failureReason: string | null
}

/**
 * One flat row per unresolved upload
 * (research/ui-ux/pages/lit-tracker/components/upload-status.md).
 *
 * In progress: the filename and a progress indicator. Failed: the filename, a
 * warning icon, and a short reason. **No grouping or summary** for several
 * failures at once — each is its own row in the same list, which is the decided
 * behaviour and the reason this is a plain list rather than a component that
 * aggregates.
 *
 * The progress indicator is indeterminate on purpose. What is being waited on
 * is extraction, and neither GROBID nor the queue reports a fraction, so a
 * percentage would be invented.
 */
export function JobList({ jobs }: { jobs: readonly UploadJobRow[] }) {
  return (
    <ul className={styles.jobs} aria-label="Uploads">
      {jobs.map((job) => (
        <li className={styles.job} key={job.id}>
          {job.status === 'failed' ? (
            <FailedJob job={job} />
          ) : (
            <ProcessingJob job={job} />
          )}
        </li>
      ))}
    </ul>
  )
}

function ProcessingJob({ job }: { job: UploadJobRow }) {
  return (
    <>
      <span className={styles.filename}>{job.filename}</span>
      {/* The state in words as well as in the bar: a bar alone conveys
          "in progress" only to someone who can see it. */}
      <span className={styles.jobState}>extracting…</span>
      <span
        className={styles.progress}
        role="progressbar"
        aria-label={`Extracting ${job.filename}`}
      />
    </>
  )
}

function FailedJob({ job }: { job: UploadJobRow }) {
  return (
    <>
      <span className={styles.filenameFailed}>
        <AlertTriangle className={styles.jobIcon} aria-hidden="true" />
        {job.filename}
      </span>
      <span className={styles.reason}>
        {job.failureReason ?? 'Extraction failed.'}
      </span>
    </>
  )
}
