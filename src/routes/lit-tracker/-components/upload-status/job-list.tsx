import { Popover } from '@base-ui/react/popover'
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
  /**
   * The article this upload produced — what the failed row's "fix" control
   * opens the edit modal on.
   *
   * Nullable because Zero types every column that way and because the column
   * genuinely is, for the window before the extract stage inserts the article.
   * A **failed** row always has one, though: every path through
   * `recordOutcome` inserts the article and sets this in the same transaction,
   * failures included (`~/lit-tracker/extraction/extract-stage.ts`). The null
   * branch below is therefore unreachable rather than expected — and it
   * degrades to the row as it looked before this feature, because a control
   * that cannot open anything is worse than no control.
   */
  readonly articleId: string | null
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
export function JobList({
  jobs,
  onFix,
}: {
  jobs: readonly UploadJobRow[]
  /** Opens the edit modal on the article behind a failed upload. */
  onFix: (articleId: string) => void
}) {
  return (
    <ul className={styles.jobs} aria-label="Uploads">
      {jobs.map((job) => (
        <li className={styles.job} key={job.id}>
          {job.status === 'failed' ? (
            <FailedJob job={job} onFix={onFix} />
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

/**
 * The row that finally has an answer.
 *
 * Until this task a failure was a statement with nothing to do about it: the
 * row reported the problem and the only way to make it go away was to delete
 * the article. The "fix" control is the exit —
 * `research/ui-ux/pages/lit-tracker/components/upload-status.md` has described
 * it since 2026-07-02, and task 1's modal is the first thing it could point at.
 *
 * **A `Popover.Close` rather than a plain button**, so the popup closes on the
 * way into the modal. Two stacked overlays read as two live surfaces at once,
 * which is the judgement `ArticleMenu`'s `modal` prop already records — and
 * closing through Base UI's own control means focus and the open state are
 * handled by the library rather than by a second copy of its rules here. It
 * does not reopen afterwards: the reader came here to fix one thing, and being
 * returned to a list they have just shortened is not where they were going.
 *
 * **Named for the upload it opens**, not "fix", because twenty failed rows
 * would otherwise be twenty identical buttons to anyone listening rather than
 * looking (WCAG 2.4.6). The filename is what names it — for a failed
 * extraction that is also the article's title, since `recordOutcome` falls back
 * to the filename when GROBID found none, so this is the paper's real name
 * rather than a stand-in for it.
 */
function FailedJob({
  job,
  onFix,
}: {
  job: UploadJobRow
  onFix: (articleId: string) => void
}) {
  const { articleId } = job

  return (
    <>
      <span className={styles.filenameFailed}>
        <AlertTriangle className={styles.jobIcon} aria-hidden="true" />
        {job.filename}
      </span>
      <span className={styles.reason}>
        {job.failureReason ?? 'Extraction failed.'}
      </span>
      {articleId !== null && (
        <Popover.Close
          className={styles.fix}
          // The visible word stays short — it sits in a narrow popup among
          // "edit…" and "delete…" elsewhere on the site — while the accessible
          // name carries the filename. Lowercase so the visible label is
          // contained in the accessible one (WCAG 2.5.3), which "Fix …" would
          // not be.
          aria-label={`fix ${job.filename}`}
          onClick={() => onFix(articleId)}
        >
          fix…
        </Popover.Close>
      )}
    </>
  )
}
