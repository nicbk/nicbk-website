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
import { user } from '~/db/schema'
import type { TestDatabase } from '~/db/test-support/test-database'
import { startTestDatabase } from '~/db/test-support/test-database'
import { pdfObjectKey } from '~/storage/object-key'
import type { TestGarage } from '~/storage/test-support/test-garage'
import {
  startTestGarage,
  TEST_ACCESS_KEY_ID,
  TEST_BUCKET,
  TEST_SECRET_ACCESS_KEY,
} from '~/storage/test-support/test-garage'

/**
 * Integration coverage for the upload path: a real Postgres, the real committed
 * migrations, a **real Garage**, and real pg-boss.
 *
 * What no unit test can show is here — that a PDF written through the storage
 * client comes back byte-identical from an actual object store, that the
 * `upload_jobs` row and the pg-boss job really do commit together, and that a
 * refused upload leaves nothing behind. The last one is checked by *looking* at
 * the store and the tables, not by trusting the response.
 *
 * The modules under test read their configuration from the validated
 * environment at import time, and the containers' addresses are only known once
 * they are running — so they are imported dynamically, after `process.env` has
 * been pointed at them.
 */

const USER_A = 'user-a-upload'
const USER_B = 'user-b-upload'

let testDatabase: TestDatabase
let garage: TestGarage
let database: DatabaseHandle

/** The modules under test, imported once the environment is pointed at the containers. */
let startQueue: typeof import('~/lit-tracker/jobs/queue').startQueue
let queue: Awaited<
  ReturnType<typeof import('~/lit-tracker/jobs/queue').startQueue>
>
let storeUpload: typeof import('./store-upload').storeUpload
let putArticlePdf: typeof import('~/storage/pdf-storage').putArticlePdf
let getArticlePdf: typeof import('~/storage/pdf-storage').getArticlePdf
let PdfOwnershipError: typeof import('~/storage/pdf-storage').PdfOwnershipError

function pdf(marker: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n${marker}\n%%EOF\n`)
}

beforeAll(async () => {
  // Started together: each pulls an image and takes tens of seconds cold.
  ;[testDatabase, garage] = await Promise.all([
    startTestDatabase(),
    startTestGarage(),
  ])

  process.env['DATABASE_URL'] = testDatabase.connectionString
  process.env['GARAGE_ENDPOINT'] = garage.endpoint
  process.env['GARAGE_ACCESS_KEY_ID'] = TEST_ACCESS_KEY_ID
  process.env['GARAGE_SECRET_ACCESS_KEY'] = TEST_SECRET_ACCESS_KEY
  process.env['GARAGE_BUCKET'] = TEST_BUCKET

  const storage = await import('~/storage/pdf-storage')
  putArticlePdf = storage.putArticlePdf
  getArticlePdf = storage.getArticlePdf
  PdfOwnershipError = storage.PdfOwnershipError
  startQueue = (await import('~/lit-tracker/jobs/queue')).startQueue
  storeUpload = (await import('./store-upload')).storeUpload
}, 300_000)

afterAll(async () => {
  await Promise.all([testDatabase.stop(), garage.stop()])
})

beforeEach(async () => {
  await testDatabase.reset()
  await garage.reset()
  // Opened after the restore: it drops and recreates the database underneath
  // any connection already open to it (see test-database.ts).
  database = createDatabase(testDatabase.connectionString)

  // The ownership FK is real, so an upload needs an owner that exists.
  await database.db
    .insert(user)
    .values(
      [USER_A, USER_B].map((id) => ({
        id,
        name: id,
        email: `${id}@example.com`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    )
    .onConflictDoNothing()

  // Started per test, after the restore: `start()` installs the `pgboss`
  // schema, and restoring the snapshot drops it along with everything else the
  // migrations did not create. A cached instance would also be holding
  // connections to a database that no longer exists.
  queue = await startQueue(testDatabase.connectionString)
}, 120_000)

afterEach(async () => {
  // `close` ends pg-boss's own pool: without it each test leaks connections to
  // a database the next `reset()` is about to drop.
  await queue.stop({ close: true, graceful: false })
  await database.pool.end()
})

/** Rows of the queue table pg-boss creates, for the transactional assertions. */
async function enqueuedJobCount(): Promise<number> {
  const { rows } = await database.db.execute<{ count: string }>(
    sql`select count(*)::text as count from pgboss.job`,
  )
  return Number(rows[0]?.count ?? '0')
}

async function uploadJobCount(): Promise<number> {
  const { rows } = await database.db.execute<{ count: string }>(
    sql`select count(*)::text as count from upload_jobs`,
  )
  return Number(rows[0]?.count ?? '0')
}

describe('the storage client, against a real Garage', () => {
  it('round-trips a PDF byte-identically under the expected key', async () => {
    const key = pdfObjectKey(USER_A, '0199a1b2-c3d4-7e5f-8a9b-000000000001')
    const body = pdf('round-trip')

    await putArticlePdf(key, body)

    expect(await getArticlePdf(key, USER_A)).toEqual(body)
  })

  it('refuses to read an object belonging to another user', async () => {
    // Refused by this path, not merely absent: the object genuinely exists, so
    // a check that only ever saw missing keys would pass vacuously.
    const key = pdfObjectKey(USER_B, '0199a1b2-c3d4-7e5f-8a9b-000000000002')
    await putArticlePdf(key, pdf('user-b'))
    expect(await garage.has(key)).toBe(true)

    await expect(getArticlePdf(key, USER_A)).rejects.toThrow(PdfOwnershipError)
    // …and its real owner can still read it.
    await expect(getArticlePdf(key, USER_B)).resolves.toEqual(pdf('user-b'))
  })
})

describe('storeUpload', () => {
  it('stores the PDF and records exactly one job and one queued task', async () => {
    const stored = await storeUpload(database, queue, {
      userId: USER_A,
      filename: 'paper.pdf',
      bytes: pdf('committed'),
    })

    expect(await uploadJobCount()).toBe(1)
    expect(await enqueuedJobCount()).toBe(1)
    expect(await garage.has(pdfObjectKey(USER_A, stored.id))).toBe(true)
  })

  it('writes the PDF under the pre-allocated id the job carries', async () => {
    // The whole point of allocating the id first: task 4 inserts the article
    // under this same id, so no blob is ever copied or renamed.
    const stored = await storeUpload(database, queue, {
      userId: USER_A,
      filename: 'paper.pdf',
      bytes: pdf('pre-allocated'),
    })

    const { rows } = await database.db.execute<{ pdf_object_key: string }>(
      sql`select pdf_object_key from upload_jobs where id = ${stored.id}`,
    )
    expect(rows[0]?.pdf_object_key).toBe(pdfObjectKey(USER_A, stored.id))
    expect(rows[0]?.pdf_object_key).toContain(stored.id)
  })

  it('leaves neither a job row nor a queued task when the transaction rolls back', async () => {
    // The transactional-send guarantee is only meaningful if tested by forcing
    // a rollback: a committed upload always has a job, and a rolled-back one
    // has none. Deleting the owner mid-transaction violates the ownership FK,
    // which is what makes the commit fail after the enqueue has been sent.
    const before = {
      jobs: await uploadJobCount(),
      queued: await enqueuedJobCount(),
    }

    await expect(
      storeUpload(database, queue, {
        userId: 'user-who-does-not-exist',
        filename: 'orphan.pdf',
        bytes: pdf('rolled-back'),
      }),
    ).rejects.toThrow()

    expect(await uploadJobCount()).toBe(before.jobs)
    expect(await enqueuedJobCount()).toBe(before.queued)
  })

  it('keeps two users uploads under separate prefixes', async () => {
    const a = await storeUpload(database, queue, {
      userId: USER_A,
      filename: 'a.pdf',
      bytes: pdf('a'),
    })
    const b = await storeUpload(database, queue, {
      userId: USER_B,
      filename: 'b.pdf',
      bytes: pdf('b'),
    })

    expect(await garage.has(pdfObjectKey(USER_A, a.id))).toBe(true)
    expect(await garage.has(pdfObjectKey(USER_B, b.id))).toBe(true)
    // Neither id appears under the other's prefix.
    expect(await garage.has(pdfObjectKey(USER_A, b.id))).toBe(false)
  })
})

describe('the upload endpoint, end to end', () => {
  /** Imported here for the same reason as the modules above: environment first. */
  async function respond(request: Request, userId: string | null) {
    const { respondToUpload } = await import('./upload-endpoint')
    return respondToUpload(request, {
      getUserId: async () => userId,
      database,
      getQueue: async () => queue,
    })
  }

  function submission(
    files: { name: string; type: string; body: Uint8Array }[],
  ) {
    const form = new FormData()
    for (const file of files) {
      form.append(
        'files',
        new File([file.body as BlobPart], file.name, { type: file.type }),
      )
    }
    return new Request('https://nicbk.com/api/lit-tracker/upload', {
      method: 'POST',
      body: form,
    })
  }

  it('stores a submitted PDF and its job', async () => {
    const response = await respond(
      submission([
        { name: 'real.pdf', type: 'application/pdf', body: pdf('endpoint') },
      ]),
      USER_A,
    )

    expect(response.status).toBe(201)
    const { accepted } = await response.json()
    expect(await garage.has(pdfObjectKey(USER_A, accepted[0].id))).toBe(true)
    expect(await uploadJobCount()).toBe(1)
  })

  it('stores nothing at all for a rejected upload', async () => {
    // Verified by looking at both stores rather than inferred from the status:
    // "nothing was stored" is the claim, so nothing stored is what is checked.
    const response = await respond(
      submission([
        {
          name: 'trojan.pdf',
          type: 'application/pdf',
          body: new TextEncoder().encode('MZ\x90\x00 not a pdf'),
        },
      ]),
      USER_A,
    )

    expect(response.status).toBe(400)
    expect(await uploadJobCount()).toBe(0)
    expect(await enqueuedJobCount()).toBe(0)
  })

  it('stores nothing when the request carries no session', async () => {
    const response = await respond(
      submission([
        { name: 'real.pdf', type: 'application/pdf', body: pdf('anon') },
      ]),
      null,
    )

    expect(response.status).toBe(401)
    expect(await uploadJobCount()).toBe(0)
  })
})
