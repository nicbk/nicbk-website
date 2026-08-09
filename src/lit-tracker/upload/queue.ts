import { PgBoss } from 'pg-boss'
import { env } from '~/env'

/**
 * The background-job queue, and the one job this feature enqueues.
 *
 * **This task only sends.** The handler that drains the queue — fetching the
 * PDF, calling GROBID, creating the article row — is task 4. Until it exists, a
 * submitted upload's job sits enqueued and its `upload_jobs` row stays in
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
 * That schema is deliberately outside the `zero_data` publication: its
 * internals are unstable across versions, and `upload_jobs` is the app-owned
 * projection clients read instead.
 */

/** The queue the extract stage will drain in task 4. */
export const EXTRACT_QUEUE = 'lit-tracker.extract'

/** What an extract job carries. The handler needs no more than this to start. */
export interface ExtractJob {
  uploadJobId: string
  userId: string
  pdfObjectKey: string
}

/**
 * What the upload path actually needs from pg-boss.
 *
 * Narrower than `PgBoss` so a caller can see, from the type alone, that
 * uploading only ever *sends* — it does not work, fail, or complete a job.
 */
export type JobQueue = Pick<PgBoss, 'send'>

/**
 * Connects to the queue and makes sure its schema and queue exist.
 *
 * `start()` creates and migrates the `pgboss` schema, and `createQueue` is
 * required before a send: pg-boss 12 rejects a send to a queue that does not
 * exist, and creating one that does is a no-op.
 *
 * Takes the connection string rather than reading the environment, so the
 * integration tests can point it at their throwaway Postgres — the same reason
 * `createDatabase` is a factory rather than a singleton.
 */
export async function startQueue(connectionString: string): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString })
  // Surfaced rather than swallowed: pg-boss emits these instead of throwing, so
  // without a listener a failing queue would go silent.
  boss.on('error', (error: unknown) => {
    console.error('pg-boss error:', error)
  })
  await boss.start()
  await boss.createQueue(EXTRACT_QUEUE)
  return boss
}

let started: Promise<PgBoss> | null = null

/**
 * The application's shared queue, connected on first use.
 *
 * Starting is slow enough that doing it per request would be wasteful, and it
 * must not race itself. Caching the promise rather than the resolved value is
 * what makes two concurrent first uploads share one startup instead of running
 * two schema migrations.
 */
export function getQueue(): Promise<PgBoss> {
  started ??= startQueue(env.DATABASE_URL)
  return started
}
