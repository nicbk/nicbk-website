import { sql } from 'drizzle-orm'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
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
import { ExtractionFailedError } from './failure'
import type { ExtractedMetadata } from './tei'

/**
 * The extraction pipeline against real infrastructure: a real Postgres with the
 * committed migrations, a **real Garage**, and **real pg-boss** actually
 * running the queue — retries, dead letter and all.
 *
 * GROBID is the one thing stubbed, in process, by replacing the injected
 * `extractMetadata`. Everything the pipeline decides is downstream of what that
 * function returns or throws, and a real GROBID container would add minutes of
 * model loading to every run for no coverage of the code under test. The real
 * service is exercised in browser verification, where the extraction quality is
 * the actual question.
 *
 * What is here and cannot be shown by a unit test: that the article really is
 * created under the pre-allocated id, that a terminal failure runs **once**,
 * that a transient one is really retried by pg-boss and can then succeed, that
 * the finalize stage really removes the row, and that the PDF really comes back
 * from the object store — proven by handing the stub the bytes it was given.
 *
 * The modules under test read their configuration at import time, and the
 * containers' addresses are only known once they are running, so they are
 * imported dynamically after `process.env` has been pointed at them.
 */

const USER_A = 'user-a-extract'
const USER_B = 'user-b-extract'

let testDatabase: TestDatabase
let garage: TestGarage
let database: DatabaseHandle

type QueueModule = typeof import('~/lit-tracker/jobs/queue')
type Boss = Awaited<ReturnType<QueueModule['startQueue']>>

let queueModule: QueueModule
let queue: Boss
let storeUpload: typeof import('~/lit-tracker/upload/store-upload').storeUpload
let productionServices: typeof import('./services').productionServices
let registerExtractionHandlers: typeof import('./worker').registerExtractionHandlers
let runExtractStage: typeof import('./extract-stage').runExtractStage
let runFinalizeStage: typeof import('./finalize-stage').runFinalizeStage

/** A well-formed extraction, as the TEI parser would report one. */
const EXTRACTED: ExtractedMetadata = {
  title: 'Bounded Staleness for Single-Node Sync Engines',
  authors: [
    { name: 'Marta Oliveira', given: 'Marta', family: 'Oliveira' },
    { name: 'Rajesh K Anand', given: 'Rajesh K', family: 'Anand' },
  ],
  abstract: 'We characterise the staleness a single-node deployment exhibits.',
  publicationYear: 2024,
  venue: 'Journal of Practical Replication',
  identifiers: {
    doi: '10.1145/3612345.3612399',
    arxivId: null,
    pubmedId: null,
  },
  bibliography: [],
}

function pdf(marker: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n${marker}\n%%EOF\n`)
}

beforeAll(async () => {
  ;[testDatabase, garage] = await Promise.all([
    startTestDatabase(),
    startTestGarage(),
  ])

  process.env['DATABASE_URL'] = testDatabase.connectionString
  process.env['GARAGE_ENDPOINT'] = garage.endpoint
  process.env['GARAGE_ACCESS_KEY_ID'] = TEST_ACCESS_KEY_ID
  process.env['GARAGE_SECRET_ACCESS_KEY'] = TEST_SECRET_ACCESS_KEY
  process.env['GARAGE_BUCKET'] = TEST_BUCKET

  queueModule = await import('~/lit-tracker/jobs/queue')
  storeUpload = (await import('~/lit-tracker/upload/store-upload')).storeUpload
  productionServices = (await import('./services')).productionServices
  registerExtractionHandlers = (await import('./worker'))
    .registerExtractionHandlers
  runExtractStage = (await import('./extract-stage')).runExtractStage
  runFinalizeStage = (await import('./finalize-stage')).runFinalizeStage
}, 300_000)

afterAll(async () => {
  await Promise.all([testDatabase.stop(), garage.stop()])
})

beforeEach(async () => {
  await testDatabase.reset()
  await garage.reset()
  database = createDatabase(testDatabase.connectionString)

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

  queue = await queueModule.startQueue(testDatabase.connectionString)
  // The production policy backs off from 30 seconds, which is right for a
  // GROBID reloading its models and useless in a test. The behaviour under test
  // is that a throw is retried at all, not how long it waits.
  await queue.updateQueue(queueModule.EXTRACT_QUEUE, {
    retryDelay: 0,
    retryBackoff: false,
    retryLimit: 2,
  })
}, 120_000)

afterEach(async () => {
  await queue.stop({ close: true, graceful: false })
  await database.pool.end()
})

/**
 * Services with a real database, Garage and queue, and stubbed externals.
 *
 * Semantic Scholar is stubbed to find nothing — which is a *successful* lookup,
 * not a failure. That keeps this file about extraction: the chain still runs
 * end to end through enrichment, and the article settles as `grobid_only`.
 * Enrichment's own behaviour is exercised in
 * `~/lit-tracker/citations/citations.integration.test.ts`.
 */
function servicesWith(
  extractMetadata: (pdf: Uint8Array) => Promise<ExtractedMetadata>,
) {
  return {
    ...productionServices(database, queue),
    extractMetadata,
    lookupPapers: async () => new Map(),
    matchPaperByTitle: async () => null,
  }
}

/** An upload sitting in `processing`, exactly as the endpoint leaves one. */
async function uploadedJob(filename: string, bytes: Uint8Array) {
  return storeUpload(database, queue, { userId: USER_A, filename, bytes })
}

async function articleRow(id: string) {
  const { rows } = await database.db.execute<Record<string, unknown>>(
    sql`select * from articles where id = ${id}`,
  )
  return rows[0]
}

async function uploadJobRow(id: string) {
  const { rows } = await database.db.execute<Record<string, unknown>>(
    sql`select * from upload_jobs where id = ${id}`,
  )
  return rows[0]
}

describe('the extract stage, against real services', () => {
  it('creates the article under the pre-allocated id, with its metadata', async () => {
    const upload = await uploadedJob('paper.pdf', pdf('extract-success'))

    await runExtractStage(
      {
        uploadJobId: upload.id,
        userId: USER_A,
        pdfObjectKey: pdfObjectKey(USER_A, upload.id),
      },
      servicesWith(async () => EXTRACTED),
    )

    const article = await articleRow(upload.id)
    expect(article).toMatchObject({
      // The same id the PDF is stored under, so no object is ever moved.
      id: upload.id,
      user_id: USER_A,
      title: EXTRACTED.title,
      publication_year: 2024,
      venue: EXTRACTED.venue,
      doi: EXTRACTED.identifiers.doi,
      extraction_status: 'grobid_only',
      // Inherited from the column default, per the decided upload flow.
      status: 'pending',
      pdf_object_key: pdfObjectKey(USER_A, upload.id),
    })
    expect(article?.['authors']).toEqual(EXTRACTED.authors)
    expect(await uploadJobRow(upload.id)).toMatchObject({
      article_id: upload.id,
      status: 'processing',
    })
  })

  it('reads the stored PDF back through the ownership-checked path', async () => {
    const bytes = pdf('proxied-read')
    const upload = await uploadedJob('paper.pdf', bytes)
    let received: Uint8Array | undefined

    await runExtractStage(
      {
        uploadJobId: upload.id,
        userId: USER_A,
        pdfObjectKey: pdfObjectKey(USER_A, upload.id),
      },
      servicesWith(async (pdfBytes) => {
        received = pdfBytes
        return EXTRACTED
      }),
    )

    // Byte-identical, from a real object store, through the same
    // ownership-checked read every other path uses. No presigned URL exists.
    expect(received).toEqual(bytes)
  })

  it('refuses a job naming another user object, and resolves it', async () => {
    const upload = await uploadedJob('paper.pdf', pdf('wrong-owner'))

    await runExtractStage(
      {
        uploadJobId: upload.id,
        // A key under USER_B, which the storage client refuses before any
        // request reaches Garage.
        userId: USER_A,
        pdfObjectKey: pdfObjectKey(USER_B, upload.id),
      },
      servicesWith(async () => EXTRACTED),
    )

    expect(await uploadJobRow(upload.id)).toMatchObject({ status: 'failed' })
    // Resolved rather than left spinning: corrupt job data is still a job the
    // user has to be able to see the end of.
    expect(await articleRow(upload.id)).toMatchObject({
      extraction_status: 'failed',
    })
  })

  it('still creates the article when extraction fails', async () => {
    const upload = await uploadedJob('scan-of-a-paper.pdf', pdf('unreadable'))

    await runExtractStage(
      {
        uploadJobId: upload.id,
        userId: USER_A,
        pdfObjectKey: pdfObjectKey(USER_A, upload.id),
      },
      servicesWith(async () => {
        throw new ExtractionFailedError("couldn't read this PDF")
      }),
    )

    // The property #11 depends on: the article exists, so a failed row in the
    // popup has something to open.
    expect(await articleRow(upload.id)).toMatchObject({
      title: 'scan-of-a-paper.pdf',
      authors: [],
      extraction_status: 'failed',
    })
    expect(await uploadJobRow(upload.id)).toMatchObject({
      status: 'failed',
      failure_reason: "couldn't read this PDF",
      article_id: upload.id,
    })
  })
})

describe('the finalize stage', () => {
  it('removes the job row, leaving the article', async () => {
    const upload = await uploadedJob('paper.pdf', pdf('finalize'))
    await runExtractStage(
      {
        uploadJobId: upload.id,
        userId: USER_A,
        pdfObjectKey: pdfObjectKey(USER_A, upload.id),
      },
      servicesWith(async () => EXTRACTED),
    )

    await runFinalizeStage(
      { uploadJobId: upload.id },
      servicesWith(async () => EXTRACTED),
    )

    expect(await uploadJobRow(upload.id)).toBeUndefined()
    expect(await articleRow(upload.id)).toBeDefined()
  })
})

describe('the pipeline under real pg-boss', () => {
  /** Counts attempts so "retried" and "not retried" can be told apart. */
  function countingStub(
    behaviour: (attempt: number) => Promise<ExtractedMetadata>,
  ) {
    const attempts = { count: 0 }
    return {
      attempts,
      extract: async () => {
        attempts.count += 1
        return behaviour(attempts.count)
      },
    }
  }

  it('runs the whole chain, leaving an article and no job row', async () => {
    const stub = countingStub(async () => EXTRACTED)
    await registerExtractionHandlers(queue, servicesWith(stub.extract))
    const upload = await uploadedJob('paper.pdf', pdf('chain'))

    await vi.waitFor(
      async () => {
        expect(await articleRow(upload.id)).toBeDefined()
        // Deleted by finalize, which is what empties the status popup.
        expect(await uploadJobRow(upload.id)).toBeUndefined()
      },
      { timeout: 30_000, interval: 250 },
    )
  })

  it('does not retry a document that will never extract', async () => {
    const stub = countingStub(async () => {
      throw new ExtractionFailedError("couldn't find authors")
    })
    await registerExtractionHandlers(queue, servicesWith(stub.extract))
    const upload = await uploadedJob('paper.pdf', pdf('terminal'))

    await vi.waitFor(
      async () => {
        expect(await uploadJobRow(upload.id)).toMatchObject({
          status: 'failed',
          failure_reason: "couldn't find authors",
        })
      },
      { timeout: 30_000, interval: 250 },
    )
    // Exactly one attempt. Retrying an unparseable PDF is the failure mode the
    // decided design warns about, and it would be invisible without this.
    expect(stub.attempts.count).toBe(1)
  })

  it('retries a service failure and succeeds once it stops', async () => {
    const stub = countingStub(async (attempt) => {
      if (attempt <= 2) {
        throw new Error('GROBID returned 503: no engine available')
      }
      return EXTRACTED
    })
    await registerExtractionHandlers(queue, servicesWith(stub.extract))
    const upload = await uploadedJob('paper.pdf', pdf('transient'))

    await vi.waitFor(
      async () => {
        expect(await articleRow(upload.id)).toMatchObject({
          extraction_status: 'grobid_only',
        })
        // Waited for alongside the article rather than after it: finalize is a
        // separate job, so the article commits a moment before the row goes.
        expect(await uploadJobRow(upload.id)).toBeUndefined()
      },
      { timeout: 60_000, interval: 250 },
    )
    // Two failures and a success. The article's status is the proof it never
    // passed through `failed` — a transient failure must not reach the reactive
    // status column at all.
    expect(stub.attempts.count).toBe(3)
  })

  it('resolves a job whose retries run out', async () => {
    // The dead-letter path. Without it a GROBID that stayed down would leave
    // the row spinning forever with no article behind it.
    const stub = countingStub(async () => {
      throw new Error('GROBID returned 503: no engine available')
    })
    await registerExtractionHandlers(queue, servicesWith(stub.extract))
    const upload = await uploadedJob('paper.pdf', pdf('exhausted'))

    await vi.waitFor(
      async () => {
        expect(await uploadJobRow(upload.id)).toMatchObject({
          status: 'failed',
        })
      },
      { timeout: 60_000, interval: 250 },
    )
    // Tried more than once, and the reason blames the service rather than the
    // file.
    expect(stub.attempts.count).toBeGreaterThan(1)
    expect(await articleRow(upload.id)).toMatchObject({
      extraction_status: 'failed',
    })
  })
})

describe('what Zero replicates', () => {
  it('leaves pg-boss own tables out of the publication', async () => {
    // The queue's tables exist by now — `startQueue` installs them — so this is
    // a real exclusion rather than a vacuous one.
    const { rows: pgbossTables } = await database.db.execute<{ count: string }>(
      sql`select count(*)::text as count from information_schema.tables where table_schema = 'pgboss'`,
    )
    expect(Number(pgbossTables[0]?.count)).toBeGreaterThan(0)

    const { rows: published } = await database.db.execute<{
      schemaname: string
      tablename: string
    }>(
      sql`select schemaname, tablename from pg_publication_tables where pubname = 'zero_data'`,
    )

    // Its internals are unstable across versions; `upload_jobs` is the
    // app-owned projection clients read instead
    // (research/system-architecture/background-jobs.md).
    expect(published.map((row) => row.schemaname)).not.toContain('pgboss')
    expect(published.map((row) => row.tablename).sort()).toEqual([
      // Both added by #8's second task, in the migration that creates them:
      // the card draws an article's tags and the filter rail will list them.
      'article_tags',
      'articles',
      // Added by the migration that creates it, in the same commit — #10
      // traverses this table from the client.
      'citation_edges',
      'tags',
      'upload_jobs',
    ])
  })
})
