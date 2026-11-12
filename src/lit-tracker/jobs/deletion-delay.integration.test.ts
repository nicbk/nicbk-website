import { sql } from 'drizzle-orm'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { createDatabase } from '~/db/create-database'
import type { TestDatabase } from '~/db/test-support/test-database'
import { startTestDatabase } from '~/db/test-support/test-database'
import { queueAccountPurge } from '~/lit-tracker/pdf/purge-stage'
import type { PdfCleanupJob } from './queue'
import {
  ACCOUNT_PURGE_QUEUE,
  PDF_CLEANUP_QUEUE,
  PHYSICAL_DELETION_DELAY_SECONDS,
  startQueue,
} from './queue'

/**
 * The deletion delay against a real pg-boss
 * (features/backups-you-can-relaunch-from, task `deletions-wait-a-day`).
 *
 * The unit tests show the sends ask for the delay. What only a real queue can
 * show is that pg-boss honours it: that the job is stored to start a day out,
 * that a worker asking for work now gets nothing, and that the account purge's
 * exclusive queue still turns a second send for the same user into no job,
 * while the first is waiting.
 */

const DELETED_USER = 'deletedUser000000000000000000000'

let testDatabase: TestDatabase
let database: DatabaseHandle
let queue: Awaited<ReturnType<typeof startQueue>>

beforeAll(async () => {
  testDatabase = await startTestDatabase()
}, 300_000)

afterAll(async () => {
  await testDatabase.stop()
})

beforeEach(async () => {
  await testDatabase.reset()
  // Opened after the restore, which drops the database under open connections.
  database = createDatabase(testDatabase.connectionString)
  queue = await startQueue(testDatabase.connectionString)
}, 120_000)

afterEach(async () => {
  await queue.stop({ close: true, graceful: false })
  await database.pool.end()
})

/** How far in the future each of a queue's jobs is due, in seconds. */
async function secondsUntilStart(queueName: string): Promise<number[]> {
  const { rows } = await database.db.execute<{ seconds: string }>(
    sql`select extract(epoch from start_after - now())::text as seconds
        from pgboss.job where name = ${queueName}`,
  )
  return rows.map((row) => Number(row.seconds))
}

describe('the deletion delay, against a real pg-boss', () => {
  it('stores a PDF cleanup to start a day out, and hands it to no worker now', async () => {
    const job: PdfCleanupJob = {
      userId: DELETED_USER,
      articleId: '00000000-0000-4000-8000-000000000001',
    }
    await queue.send(PDF_CLEANUP_QUEUE, job, {
      startAfter: PHYSICAL_DELETION_DELAY_SECONDS,
    })

    const [due] = await secondsUntilStart(PDF_CLEANUP_QUEUE)
    // A minute of slack either side for the clock between send and select.
    expect(due).toBeGreaterThan(PHYSICAL_DELETION_DELAY_SECONDS - 60)
    expect(due).toBeLessThanOrEqual(PHYSICAL_DELETION_DELAY_SECONDS + 60)
    // What a worker polling now would be handed: nothing.
    expect(await queue.fetch(PDF_CLEANUP_QUEUE)).toEqual([])
  })

  it('queues one delayed purge however many times an account is asked for', async () => {
    // The deletion hook first, then a worker start's sweep while the first
    // purge is still waiting out its day.
    await queueAccountPurge(queue, DELETED_USER)
    await queueAccountPurge(queue, DELETED_USER)

    const due = await secondsUntilStart(ACCOUNT_PURGE_QUEUE)
    expect(due).toHaveLength(1)
    expect(due[0]).toBeGreaterThan(PHYSICAL_DELETION_DELAY_SECONDS - 60)
    expect(await queue.fetch(ACCOUNT_PURGE_QUEUE)).toEqual([])
  })
})
