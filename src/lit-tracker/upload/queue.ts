import { PgBoss } from 'pg-boss'
import { env } from '~/env'

/**
 * The background-job queue, and the one job this feature enqueues.
 *
 * **This task only sends.** The handler that drains the queue — fetching the
 * PDF, calling GROBID, creating the article row — is task 4. Until it exists,
 * a submitted upload's job sits enqueued and its `upload_jobs` row stays in
 * `processing`, which is the intended intermediate state rather than a defect
 * (see the task's description.md).
 *
 * The send side lives here rather than waiting for task 4 because the enqueue
 * has to happen inside the upload's own Postgres transaction, and that
 * transaction is written in this task. Deferring it would mean reopening and
 * rewriting the upload path later — exactly the rework the feature's ordering
 * exists to avoid.
 *
 * pg-boss keeps its own tables in a `pgboss` schema in the shared database.
 * That schema is deliberately outside the `zero_data` publication: its internals
 * are unstable across versions, and `upload_jobs` is the app-owned projection
 * clients read instead.
 */

/** The queue the extract stage will drain in task 4. */
export const EXTRACT_QUEUE = 'lit-tracker.extract'

/** What an extract job carries. The handler needs no more than this to start. */
export interface ExtractJob {
  uploadJobId: string
  userId: string
  pdfObjectKey: string
}

let started: Promise<PgBoss> | null = null

/**
 * The shared pg-boss instance, started on first use.
 *
 * `start()` creates and migrates the `pgboss` schema, so it must have run once
 * before any send — but it is slow enough that doing it per request would be
 * wasteful, and it must not race itself. Caching the promise (not the resolved
 * value) is what makes two concurrent first uploads share one startup instead
 * of running two migrations.
 *
 * Its own connection string rather than the app's Drizzle pool: pg-boss
 * maintains background workers and a listener connection with a lifecycle of
 * its own. The enqueue is the only part that must join the app's transaction,
 * and that is passed per call — see `sendExtractJob`.
 */
export function getBoss(): Promise<PgBoss> {
  if (!started) {
    started = (async () => {
      const boss = new PgBoss({ connectionString: env.DATABASE_URL })
      // Surfaced rather than swallowed: pg-boss emits these instead of
      // throwing, so without a listener a failing queue would go silent.
      boss.on('error', (error: unknown) => {
        console.error('pg-boss error:', error)
      })
      await boss.start()
      // Sending to a queue that does not exist is an error in pg-boss 12, and
      // creating one that does is a no-op.
      await boss.createQueue(EXTRACT_QUEUE)
      return boss
    })()
  }
  return started
}
