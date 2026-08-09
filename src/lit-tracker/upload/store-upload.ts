import { sql } from 'drizzle-orm'
import { fromDrizzle } from 'pg-boss'
import type { DatabaseHandle } from '~/db/create-database'
import { uploadJobs } from '~/db/schema'
import { pdfObjectKey } from '~/storage/object-key'
import { putArticlePdf } from '~/storage/pdf-storage'
import type { ExtractJob } from './queue'
import { EXTRACT_QUEUE, getBoss } from './queue'

/**
 * Stores one validated PDF and records the work of extracting it.
 *
 * Server-only. The file has already been checked by `validation.ts`; this
 * module assumes that and concerns itself with *ordering*, which is the part
 * that decides what a crash leaves behind.
 *
 * ## The order is the design
 *
 * 1. **Allocate the id.** Postgres generates it, as
 *    upload-jobs-schema.md decided, but a step early — the PDF has to be
 *    written under it, and it is also the id the article will later take, so no
 *    blob is ever copied or renamed (`object-key.ts`).
 * 2. **Write the PDF.** Before the transaction, deliberately, so the object
 *    store is never a participant in it and the transaction stays short.
 * 3. **Record and enqueue, in one transaction.** The `upload_jobs` row and the
 *    pg-boss job commit together or not at all.
 *
 * A crash between 2 and 3 leaves an object with no row pointing at it: garbage,
 * cleanable, invisible to the user. The opposite order would leave a job whose
 * PDF does not exist, which the extract stage could only discover by failing.
 * Neither ordering is free; this one fails in the harmless direction.
 *
 * ## Why the enqueue must share the transaction
 *
 * A committed upload with no job would sit in `processing` forever with nothing
 * coming to resolve it, and an enqueued job with no committed row would have
 * nothing to work on. pg-boss takes a `db` adapter per call, so only the
 * enqueue joins this transaction — the rest of pg-boss keeps its own
 * connections.
 */

/** What the caller needs back to report the upload it just accepted. */
export interface StoredUpload {
  /** The pre-allocated id: this job's, and the future article's. */
  id: string
  filename: string
}

/**
 * Writes one PDF to the blob store and records its extraction job.
 *
 * Takes the database handle rather than importing the singleton so the
 * integration tests can run the real thing against a throwaway Postgres — the
 * same reason `createDatabase` is a factory.
 */
export async function storeUpload(
  { db }: DatabaseHandle,
  upload: { userId: string; filename: string; bytes: Uint8Array },
): Promise<StoredUpload> {
  const id = await allocateId(db)
  const key = pdfObjectKey(upload.userId, id)

  await putArticlePdf(key, upload.bytes)

  const boss = await getBoss()

  await db.transaction(async (tx) => {
    await tx.insert(uploadJobs).values({
      id,
      userId: upload.userId,
      filename: upload.filename,
      pdfObjectKey: key,
    })

    const job: ExtractJob = {
      uploadJobId: id,
      userId: upload.userId,
      pdfObjectKey: key,
    }
    // `fromDrizzle` is pg-boss's own adapter: it wraps this transaction as the
    // connection the insert runs on, so the job row lands inside it.
    await boss.send(EXTRACT_QUEUE, job, { db: fromDrizzle(tx, sql) })
  })

  return { id, filename: upload.filename }
}

/**
 * Asks Postgres for the next UUIDv7.
 *
 * The column defaults to `uuidv7()`, but the value is needed *before* the
 * insert — the object key contains it. Reading it from the same function the
 * default uses keeps ids monotonic and keeps generation in Postgres, which is
 * where zero-schema-conventions.md puts it for this one table.
 */
async function allocateId(db: DatabaseHandle['db']): Promise<string> {
  const { rows } = await db.execute<{ id: string }>(sql`select uuidv7() as id`)
  const [row] = rows
  if (!row) {
    throw new Error('Postgres returned no id for the upload job.')
  }
  return row.id
}
