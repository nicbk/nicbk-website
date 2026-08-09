/**
 * The one distinction the whole pipeline turns on: will trying again help?
 *
 * Getting this backwards is the failure mode
 * research/system-architecture/background-jobs.md warns about in both
 * directions — an unparseable PDF retried forever, or a momentary blip written
 * to the user as a permanent failure. So it is expressed as a type rather than
 * as a convention:
 *
 * - **Terminal** — throw `ExtractionFailedError`. The job resolves to
 *   `upload_jobs.status = 'failed'` carrying its reason, the article is created
 *   with fallbacks, and nothing retries.
 * - **Transient** — throw anything else. pg-boss retries with backoff, and the
 *   reactive `status` column never sees it, because the job has not reached a
 *   terminal outcome yet.
 *
 * Transient is the default deliberately. An unrecognised error is far more
 * likely to be infrastructure than a bad document, and a wrongly-retried job
 * still resolves in the end — the dead-letter handler records a failure once
 * the retries are exhausted — while a wrongly-terminal one is simply lost.
 */

/**
 * A document that will never extract, however many times it is tried.
 *
 * `reason` is user-facing: it is written to `upload_jobs.failure_reason` and
 * rendered verbatim in the status popup next to the filename, so it is a short
 * lowercase fragment ("couldn't find authors"), not a sentence or a stack
 * trace. Anything an operator needs instead goes in `detail`, which is logged
 * and never shown.
 */
export class ExtractionFailedError extends Error {
  readonly reason: string

  constructor(reason: string, detail?: string) {
    super(detail ? `${reason} (${detail})` : reason)
    this.name = 'ExtractionFailedError'
    this.reason = reason
  }
}
