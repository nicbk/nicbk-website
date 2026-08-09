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
import type { SemanticScholarPaper } from '~/lit-tracker/enrichment/client'
import { SemanticScholarUnavailableError } from '~/lit-tracker/enrichment/failure'
import type { ExtractedMetadata } from '~/lit-tracker/extraction/tei'
import { pdfObjectKey } from '~/storage/object-key'
import type { TestGarage } from '~/storage/test-support/test-garage'
import {
  startTestGarage,
  TEST_ACCESS_KEY_ID,
  TEST_BUCKET,
  TEST_SECRET_ACCESS_KEY,
} from '~/storage/test-support/test-garage'

/**
 * The citation graph against a real Postgres running the committed migrations,
 * a real Garage and real pg-boss — with Semantic Scholar the only thing stubbed.
 *
 * The graph is where this feature's behaviour is least visible from the code.
 * Nothing renders it until #10, the matching rule fires from two directions at
 * two different times, and its constraints (`on delete set null`, the partial
 * index, the per-user scoping) are the database's rather than the application's.
 * All of that is exactly what a unit test cannot show and a user cannot see.
 *
 * The modules under test read their configuration at import time, so they are
 * imported dynamically once the containers' addresses are known.
 */

const USER_A = 'user-a-citations'
const USER_B = 'user-b-citations'

let testDatabase: TestDatabase
let garage: TestGarage
let database: DatabaseHandle

type QueueModule = typeof import('~/lit-tracker/jobs/queue')
let queueModule: QueueModule
let queue: Awaited<ReturnType<QueueModule['startQueue']>>
let storeUpload: typeof import('~/lit-tracker/upload/store-upload').storeUpload
let productionServices: typeof import('~/lit-tracker/extraction/services').productionServices
let registerExtractionHandlers: typeof import('~/lit-tracker/extraction/worker').registerExtractionHandlers

/** A reference, as the TEI parser reports one. */
function reference(
  title: string,
  family: string,
  identifiers: Partial<ExtractedMetadata['identifiers']> = {},
): ExtractedMetadata['bibliography'][number] {
  return {
    title,
    authors: [{ name: `Someone ${family}`, family }],
    publicationYear: 2019,
    venue: null,
    identifiers: { doi: null, arxivId: null, pubmedId: null, ...identifiers },
    raw: `${family}. ${title}. 2019.`,
  }
}

/** A parsed paper, as the TEI parser reports one. */
function extraction(
  overrides: Partial<ExtractedMetadata> = {},
): ExtractedMetadata {
  return {
    title: 'Bounded Staleness for Single-Node Sync Engines',
    authors: [{ name: 'Marta Oliveira', given: 'Marta', family: 'Oliveira' }],
    abstract: null,
    publicationYear: 2024,
    venue: null,
    identifiers: { doi: null, arxivId: null, pubmedId: null },
    bibliography: [],
    ...overrides,
  }
}

function paper(overrides: Partial<SemanticScholarPaper>): SemanticScholarPaper {
  return {
    paperId: 's2-default',
    title: null,
    abstract: null,
    year: null,
    venue: null,
    externalIds: null,
    authors: null,
    ...overrides,
  }
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
  productionServices = (await import('~/lit-tracker/extraction/services'))
    .productionServices
  registerExtractionHandlers = (await import('~/lit-tracker/extraction/worker'))
    .registerExtractionHandlers
}, 300_000)

afterAll(async () => {
  await Promise.all([testDatabase.stop(), garage.stop()])
})

beforeEach(async () => {
  await testDatabase.reset()
  await garage.reset()
  database = createDatabase(testDatabase.connectionString)

  await database.db.insert(user).values(
    [USER_A, USER_B].map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  )

  queue = await queueModule.startQueue(testDatabase.connectionString)
  // The production policies back off in tens of seconds, which is right for a
  // busy public API and useless in a test. What is under test is whether a
  // throw is retried and where it ends up, not how long it waits.
  for (const name of [queueModule.EXTRACT_QUEUE, queueModule.ENRICH_QUEUE]) {
    await queue.updateQueue(name, {
      retryDelay: 0,
      retryBackoff: false,
      retryLimit: 2,
    })
  }
}, 120_000)

afterEach(async () => {
  await queue.stop({ close: true, graceful: false })
  await database.pool.end()
})

/** How Semantic Scholar behaves for one test. */
interface Stub {
  papers?: Record<string, SemanticScholarPaper>
  match?: SemanticScholarPaper | null
  unavailable?: boolean
}

function servicesWith(metadata: ExtractedMetadata, stub: Stub = {}) {
  return {
    ...productionServices(database, queue),
    extractMetadata: async () => metadata,
    lookupPapers: async (keys: string[]) => {
      if (stub.unavailable) {
        throw new SemanticScholarUnavailableError('429 after backoff')
      }
      const found = new Map<string, SemanticScholarPaper>()
      for (const key of keys) {
        const hit = stub.papers?.[key]
        if (hit) {
          found.set(key, hit)
        }
      }
      return found
    },
    matchPaperByTitle: async () => {
      if (stub.unavailable) {
        throw new SemanticScholarUnavailableError('429 after backoff')
      }
      return stub.match ?? null
    },
  }
}

/** Uploads a PDF and drains the whole chain, returning the article's id. */
async function uploadAndSettle(
  filename: string,
  metadata: ExtractedMetadata,
  stub: Stub = {},
  userId = USER_A,
): Promise<string> {
  const upload = await storeUpload(database, queue, {
    userId,
    filename,
    bytes: pdf(filename),
  })
  const services = servicesWith(metadata, stub)
  const { runExtractStage } = await import(
    '~/lit-tracker/extraction/extract-stage'
  )
  const { runEnrichStage } = await import(
    '~/lit-tracker/extraction/enrich-stage'
  )
  const { runFinalizeStage } = await import(
    '~/lit-tracker/extraction/finalize-stage'
  )

  // The stages are driven directly rather than through the worker so each test
  // asserts against a settled database instead of polling one. The queue-driven
  // path — retries, dead letter — is exercised on its own further down.
  const job = {
    uploadJobId: upload.id,
    userId,
    pdfObjectKey: pdfObjectKey(userId, upload.id),
  }
  await runExtractStage(job, services)
  const sent = await pendingEnrichJob(upload.id)
  if (sent) {
    await runEnrichStage(sent, services)
    await runFinalizeStage({ uploadJobId: upload.id }, services)
  }
  return upload.id
}

/** The enrich job the extract stage enqueued, read out of pg-boss's own table. */
async function pendingEnrichJob(uploadJobId: string) {
  const { rows } = await database.db.execute<{ data: unknown }>(
    sql`select data from pgboss.job
        where name = ${queueModule.ENRICH_QUEUE}
          and data->>'uploadJobId' = ${uploadJobId}
        limit 1`,
  )
  return rows[0]?.data as
    | Parameters<
        typeof import('~/lit-tracker/extraction/enrich-stage').runEnrichStage
      >[0]
    | undefined
}

async function edgesOf(citingArticleId: string) {
  const { rows } = await database.db.execute<Record<string, unknown>>(
    sql`select * from citation_edges where citing_article_id = ${citingArticleId} order by title`,
  )
  return rows
}

async function articleRow(id: string) {
  const { rows } = await database.db.execute<Record<string, unknown>>(
    sql`select * from articles where id = ${id}`,
  )
  return rows[0]
}

describe('the migration', () => {
  it('creates citation_edges with the constraint and indexes it was specified with', async () => {
    const { rows: indexes } = await database.db.execute<{ indexname: string }>(
      sql`select indexname from pg_indexes where tablename = 'citation_edges'`,
    )
    const names = indexes.map((row) => row.indexname)

    expect(names).toEqual(
      expect.arrayContaining([
        'citation_edges_citing_idx',
        'citation_edges_cited_idx',
        'citation_edges_user_s2_idx',
      ]),
    )
    // Data integrity, not an upsert mechanism: one article cannot cite the same
    // resolved paper twice.
    expect(names).toContain('citation_edges_citing_s2_key')
  })

  it('indexes only the unresolved edges by Semantic Scholar id', async () => {
    // The partial index is the one graduation actually reads. Resolved rows
    // would be dead weight in it, and a full index would hide that.
    const { rows } = await database.db.execute<{ indexdef: string }>(
      sql`select indexdef from pg_indexes where indexname = 'citation_edges_user_s2_idx'`,
    )

    expect(rows[0]?.indexdef).toMatch(/WHERE \(cited_article_id IS NULL\)/i)
  })
})

describe('a successful enrichment', () => {
  it('records the id, fills the metadata and promotes the article', async () => {
    const articleId = await uploadAndSettle(
      'paper.pdf',
      extraction({
        identifiers: { doi: '10.1/paper', arxivId: null, pubmedId: null },
      }),
      {
        papers: {
          'DOI:10.1/paper': paper({
            paperId: 's2-paper',
            year: 2017,
            venue: 'Journal of Practical Replication',
          }),
        },
      },
    )

    expect(await articleRow(articleId)).toMatchObject({
      semantic_scholar_id: 's2-paper',
      venue: 'Journal of Practical Replication',
      // Corrected, because the match came from a DOI.
      publication_year: 2017,
      extraction_status: 'enriched',
    })
  })

  it('writes one edge per reference, resolved or not', async () => {
    const articleId = await uploadAndSettle(
      'paper.pdf',
      extraction({
        bibliography: [
          reference('A Resolvable Reference', 'Byron', { doi: '10.1/ref' }),
          reference('A Reference With No Identifier', 'Hopper'),
        ],
      }),
      { papers: { 'DOI:10.1/ref': paper({ paperId: 's2-ref' }) } },
    )

    const edges = await edgesOf(articleId)
    expect(edges).toHaveLength(2)
    expect(edges[1]).toMatchObject({ semantic_scholar_id: 's2-ref' })
    // Unresolved, but not lost: this is a placeholder, not a missing row.
    expect(edges[0]).toMatchObject({
      title: 'A Reference With No Identifier',
      semantic_scholar_id: null,
      cited_article_id: null,
    })
  })

  it('keeps enough on an unresolved edge to render it without a join', async () => {
    // The "not in collection" case #10 shows as bare metadata: no article row
    // exists to join to, so these columns are the only source there is.
    const articleId = await uploadAndSettle(
      'paper.pdf',
      extraction({
        bibliography: [reference('A Reference With No Identifier', 'Hopper')],
      }),
    )

    expect((await edgesOf(articleId))[0]).toMatchObject({
      title: 'A Reference With No Identifier',
      publication_year: 2019,
      authors: [{ name: 'Someone Hopper', family: 'Hopper' }],
      cited_article_id: null,
    })
  })
})

describe('graduation', () => {
  it('resolves a new edge against a paper already in the collection', async () => {
    // Direction one. The cited paper is uploaded first.
    const citedId = await uploadAndSettle(
      'cited.pdf',
      extraction({
        title: 'The Cited Paper',
        identifiers: { doi: '10.1/cited', arxivId: null, pubmedId: null },
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )

    const citingId = await uploadAndSettle(
      'citing.pdf',
      extraction({
        title: 'The Citing Paper',
        bibliography: [
          reference('The Cited Paper', 'Oliveira', { doi: '10.1/cited' }),
        ],
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )

    expect((await edgesOf(citingId))[0]).toMatchObject({
      cited_article_id: citedId,
    })
  })

  it('resolves a waiting edge when the paper it referenced is uploaded later', async () => {
    // Direction two — the one easiest to forget, and the reason the decided
    // rule says "both". Without it, uploading in this order would leave the
    // bibliography permanently unresolved with both papers in the collection.
    const citingId = await uploadAndSettle(
      'citing.pdf',
      extraction({
        title: 'The Citing Paper',
        bibliography: [
          reference('The Cited Paper', 'Oliveira', { doi: '10.1/cited' }),
        ],
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )
    expect((await edgesOf(citingId))[0]).toMatchObject({
      cited_article_id: null,
    })

    const citedId = await uploadAndSettle(
      'cited.pdf',
      extraction({
        title: 'The Cited Paper',
        identifiers: { doi: '10.1/cited', arxivId: null, pubmedId: null },
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )

    expect((await edgesOf(citingId))[0]).toMatchObject({
      cited_article_id: citedId,
    })
  })

  it('matches two GROBID-only records on title and author', async () => {
    // Neither side has an identifier, so the fallback is the only thing that
    // can connect them — the case it was accepted into the rule for.
    const citingId = await uploadAndSettle(
      'citing.pdf',
      extraction({
        title: 'The Citing Paper',
        bibliography: [
          // Differing case and spacing, as two reference lists would print it.
          reference('  the cited paper  ', 'Oliveira'),
        ],
      }),
    )

    const citedId = await uploadAndSettle(
      'cited.pdf',
      extraction({
        title: 'The Cited Paper',
        authors: [{ name: 'Marta Oliveira', family: 'Oliveira' }],
      }),
    )

    expect((await edgesOf(citingId))[0]).toMatchObject({
      cited_article_id: citedId,
    })
  })

  it('does not resolve against another user article, however well it matches', async () => {
    // Non-vacuous: the other user's article is genuinely present, with the same
    // Semantic Scholar id, so this cannot pass by finding nothing.
    const theirs = await uploadAndSettle(
      'cited.pdf',
      extraction({
        title: 'The Cited Paper',
        identifiers: { doi: '10.1/cited', arxivId: null, pubmedId: null },
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
      USER_B,
    )
    expect(await articleRow(theirs)).toMatchObject({
      semantic_scholar_id: 's2-cited',
    })

    const mine = await uploadAndSettle(
      'citing.pdf',
      extraction({
        title: 'The Citing Paper',
        bibliography: [
          reference('The Cited Paper', 'Oliveira', { doi: '10.1/cited' }),
        ],
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )

    // Two accounts holding the same paper hold two unrelated collections.
    expect((await edgesOf(mine))[0]).toMatchObject({ cited_article_id: null })
  })
})

describe('deleting an article', () => {
  it('reverts the edges that pointed at it to placeholders', async () => {
    const citedId = await uploadAndSettle(
      'cited.pdf',
      extraction({
        title: 'The Cited Paper',
        identifiers: { doi: '10.1/cited', arxivId: null, pubmedId: null },
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )
    const citingId = await uploadAndSettle(
      'citing.pdf',
      extraction({
        title: 'The Citing Paper',
        bibliography: [
          reference('The Cited Paper', 'Oliveira', { doi: '10.1/cited' }),
        ],
      }),
      { papers: { 'DOI:10.1/cited': paper({ paperId: 's2-cited' }) } },
    )

    await database.db.execute(sql`delete from articles where id = ${citedId}`)

    // The citing paper still cited it, whether or not it remains in this
    // collection — so the entry survives as an unresolved placeholder.
    const edges = await edgesOf(citingId)
    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      cited_article_id: null,
      title: 'The Cited Paper',
    })
  })

  it('takes the citing article bibliography with it', async () => {
    const citingId = await uploadAndSettle(
      'citing.pdf',
      extraction({
        bibliography: [reference('Some Reference', 'Hopper')],
      }),
    )

    await database.db.execute(sql`delete from articles where id = ${citingId}`)

    expect(await edgesOf(citingId)).toHaveLength(0)
  })

  it('cascades the whole graph away with the account', async () => {
    // Completes the chain #6 could not test, because none of these tables
    // existed yet.
    await uploadAndSettle(
      'citing.pdf',
      extraction({ bibliography: [reference('Some Reference', 'Hopper')] }),
    )

    await database.db.execute(sql`delete from "user" where id = ${USER_A}`)

    const { rows } = await database.db.execute<{ count: string }>(
      sql`select count(*)::text as count from citation_edges`,
    )
    expect(rows[0]?.count).toBe('0')
  })
})

describe('when Semantic Scholar is unavailable', () => {
  it('keeps the article, finalizes the job, and never fails the upload', async () => {
    // The behaviour that only breaks in production conditions nobody tests by
    // hand: an external, rate-limited API must not be able to fail an upload.
    const upload = await storeUpload(database, queue, {
      userId: USER_A,
      filename: 'paper.pdf',
      bytes: pdf('unavailable'),
    })
    const metadata = extraction({
      identifiers: { doi: '10.1/paper', arxivId: null, pubmedId: null },
      bibliography: [reference('Some Reference', 'Hopper')],
    })
    await registerExtractionHandlers(
      queue,
      servicesWith(metadata, { unavailable: true }),
    )

    const { rows } = await database.db.execute<{ status: string }>(
      sql`select status from upload_jobs where id = ${upload.id}`,
    )
    expect(rows[0]?.status).toBe('processing')

    // Driven by real pg-boss: the enrich job fails, is retried, exhausts its
    // retries, lands on the dead-letter queue, and is finalized from there.
    const { vi } = await import('vitest')
    await vi.waitFor(
      async () => {
        const job = await database.db.execute<{ id: string }>(
          sql`select id from upload_jobs where id = ${upload.id}`,
        )
        expect(job.rows).toHaveLength(0)
      },
      { timeout: 60_000, interval: 250 },
    )

    expect(await articleRow(upload.id)).toMatchObject({
      // A success state, not a failure: the article is complete and readable.
      extraction_status: 'grobid_only',
      semantic_scholar_id: null,
    })
    // The bibliography survived, because it is written by extraction rather
    // than by the stage that could not reach a third party.
    expect(await edgesOf(upload.id)).toHaveLength(1)
  }, 120_000)
})
