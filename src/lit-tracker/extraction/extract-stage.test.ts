// @vitest-environment node
//
// Server module: the doubles below stand in for Postgres, Garage and GROBID.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { citationEdges } from '~/db/schema'
import type { ExtractJob } from '~/lit-tracker/jobs/queue'
import { PdfOwnershipError } from '~/storage/pdf-storage'
import { runExhaustedExtractStage, runExtractStage } from './extract-stage'
import { ExtractionFailedError } from './failure'
import type { ExtractionServices } from './services'
import type { ExtractedMetadata } from './tei'

/**
 * The extract stage's decisions, with the infrastructure replaced.
 *
 * The integration tier proves these hold against a real Postgres. What it
 * cannot show cheaply is *why* each one was made, and each has a failure mode
 * the schema alone does not prevent: an article that is not created leaves #11
 * nothing to open, a terminal failure that throws is retried forever, and a
 * failed job that still enqueues finalize deletes the only row telling the user
 * something needs them.
 */

const JOB: ExtractJob = {
  uploadJobId: '01930000-0000-7000-8000-0000000000aa',
  userId: 'user-a',
  pdfObjectKey:
    'lit-tracker/user-a/01930000-0000-7000-8000-0000000000aa/source.pdf',
}

const FILENAME = 'a-paper-with-a-long-name.pdf'

const NO_IDENTIFIERS = { doi: null, arxivId: null, pubmedId: null }

/** A complete extraction, as the parser would report it. */
const COMPLETE: ExtractedMetadata = {
  title: 'Bounded Staleness for Single-Node Sync Engines',
  authors: [{ name: 'Marta Oliveira', given: 'Marta', family: 'Oliveira' }],
  abstract: 'We characterise the staleness a single-node deployment exhibits.',
  publicationYear: 2024,
  venue: 'Journal of Practical Replication',
  identifiers: { ...NO_IDENTIFIERS, doi: '10.1145/3612345.3612399' },
  bibliography: [],
}

/** Two references: one Semantic Scholar can resolve, one it cannot. */
const REFERENCES: ExtractedMetadata['bibliography'] = [
  {
    title: 'A Reference With An ArXiv Id',
    authors: [{ name: 'Ada Byron', family: 'Byron' }],
    publicationYear: 2019,
    venue: null,
    identifiers: { ...NO_IDENTIFIERS, arxivId: '1901.00001' },
    raw: 'Byron, A. A Reference With An ArXiv Id. 2019.',
  },
  {
    title: 'A Reference With Nothing To Look It Up By',
    authors: [{ name: 'Grace Hopper', family: 'Hopper' }],
    publicationYear: 1959,
    venue: 'Proceedings of Something',
    identifiers: NO_IDENTIFIERS,
    raw: null,
  },
]

/** What a run wrote, and in what order. */
interface Recorded {
  steps: string[]
  article: Record<string, unknown> | undefined
  articleOnConflict: Record<string, unknown> | undefined
  jobUpdate: Record<string, unknown> | undefined
  edges: Record<string, unknown>[]
  sent: { queue: string; job: unknown }[]
}

let recorded: Recorded

/**
 * A database double recording the writes rather than performing them.
 *
 * `uploadJob` is what `findFirst` answers with — `undefined` stands for a row
 * that has been deleted while its job sat in the queue.
 */
function fakeDatabase(
  uploadJob: { filename: string } | undefined,
): DatabaseHandle {
  // Which table is being written decides what is recorded, taken from the
  // table Drizzle was handed rather than from the shape of the call — the
  // article's insert and the edges' differ only in whether they go on to
  // `.onConflictDoUpdate`, which is far too subtle a thing to key a double on.
  const tx = {
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        // Edges are inserted plainly, so this call is awaited as it stands.
        if (table === citationEdges) {
          recorded.steps.push('insert-edges')
          recorded.edges = values as Record<string, unknown>[]
          return Promise.resolve()
        }
        // The article's insert continues into `.onConflictDoUpdate`, because a
        // replayed stage has to be able to write it twice.
        return {
          onConflictDoUpdate: async ({
            set,
          }: {
            set: Record<string, unknown>
          }) => {
            recorded.steps.push('insert-article')
            recorded.article = values as Record<string, unknown>
            recorded.articleOnConflict = set
          },
        }
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          const done = Promise.resolve().then(() => {
            recorded.steps.push('update-job')
            recorded.jobUpdate = values
          })
          // Awaitable directly, and continuable into `.returning()` — which is
          // how `graduateEdgesCiting` asks which rows it changed.
          return Object.assign(done, {
            returning: async () => {
              await done
              return []
            },
          })
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        recorded.steps.push('delete-edges')
      },
    }),
    // The graduation scan: this user's unresolved edges waiting on this paper.
    select: () => ({ from: () => ({ where: async () => [] }) }),
    // UUIDv7s come from Postgres, so the double has to supply them.
    execute: async () => ({
      rows: REFERENCES.map((_entry, index) => ({
        id: `01930000-0000-7000-8000-00000000ed0${index}`,
      })),
    }),
  }

  const db = {
    query: {
      uploadJobs: {
        findFirst: async () => {
          recorded.steps.push('load-job')
          return uploadJob
        },
      },
    },
    transaction: async (run: (tx: unknown) => Promise<void>) => {
      recorded.steps.push('begin')
      await run(tx)
      recorded.steps.push('commit')
    },
  }
  return { db, pool: {} } as unknown as DatabaseHandle
}

/** Services whose GROBID half is whatever the test needs it to be. */
function fakeServices(options: {
  uploadJob?: { filename: string } | undefined
  extract?: () => Promise<ExtractedMetadata>
  fetchPdf?: () => Promise<Uint8Array>
}): ExtractionServices {
  return {
    database: fakeDatabase(
      'uploadJob' in options ? options.uploadJob : { filename: FILENAME },
    ),
    queue: {
      send: vi.fn(async (queue: string, job: unknown) => {
        recorded.steps.push('enqueue-next')
        recorded.sent.push({ queue, job })
        return 'job-id'
      }),
    } as unknown as ExtractionServices['queue'],
    fetchPdf:
      options.fetchPdf ??
      (async () => {
        recorded.steps.push('fetch-pdf')
        return new TextEncoder().encode('%PDF-1.7')
      }),
    extractMetadata:
      options.extract ??
      (async () => {
        recorded.steps.push('extract')
        return COMPLETE
      }),
    // This stage never reaches Semantic Scholar — enrichment is a stage of its
    // own, and calling one from here would be the failure these doubles exist
    // to make visible.
    lookupPapers: async () => {
      throw new Error('the extract stage must not call Semantic Scholar')
    },
    matchPaperByTitle: async () => {
      throw new Error('the extract stage must not call Semantic Scholar')
    },
    fetchReferences: async () => {
      throw new Error('the extract stage must not call Semantic Scholar')
    },
  }
}

beforeEach(() => {
  recorded = {
    steps: [],
    article: undefined,
    articleOnConflict: undefined,
    jobUpdate: undefined,
    edges: [],
    sent: [],
  }
})

describe('a successful extraction', () => {
  it('writes the article, resolves the job and enqueues enrichment, in one transaction', async () => {
    await runExtractStage(JOB, fakeServices({}))

    // The whole sequence as one assertion: everything that must commit together
    // sits between `begin` and `commit`, and nothing reaches the database
    // before GROBID has answered.
    expect(recorded.steps).toEqual([
      'load-job',
      'fetch-pdf',
      'extract',
      'begin',
      'insert-article',
      'update-job',
      // An empty bibliography still clears whatever a replay left behind.
      'delete-edges',
      'enqueue-next',
      'commit',
    ])
    // Enrichment, not finalize: the chain gained a stage, and the row must stay
    // in the popup until Semantic Scholar has had its turn.
    expect(recorded.sent[0]?.queue).toBe('lit-tracker.enrich')
    expect(recorded.sent[0]?.job).toMatchObject({
      uploadJobId: JOB.uploadJobId,
      articleId: JOB.uploadJobId,
    })
  })

  it('hands enrichment a lookup key for the paper and for each reference that has one', async () => {
    await runExtractStage(
      JOB,
      fakeServices({
        extract: async () => ({ ...COMPLETE, bibliography: REFERENCES }),
      }),
    )

    // The keys travel in the payload because most of them have nowhere to be
    // read back from: an edge stores the Semantic Scholar id it ends up with,
    // never the arXiv id the citing paper printed.
    expect(recorded.sent[0]?.job).toMatchObject({
      articleLookupKey: 'DOI:10.1145/3612345.3612399',
      edgeLookups: [
        { edgeId: expect.any(String), key: 'ARXIV:1901.00001' },
        // The reference with no identifier contributes no lookup at all rather
        // than a request that could only fail.
      ],
    })
  })

  it('writes one edge per reference, whether or not it can be resolved', async () => {
    await runExtractStage(
      JOB,
      fakeServices({
        extract: async () => ({ ...COMPLETE, bibliography: REFERENCES }),
      }),
    )

    // Written here, in the transaction that creates the article, rather than
    // during enrichment: a public API being busy must not cost the user a
    // paper's whole bibliography.
    expect(recorded.edges).toHaveLength(2)
    expect(recorded.edges[0]).toMatchObject({
      citingArticleId: JOB.uploadJobId,
      userId: JOB.userId,
      title: REFERENCES[0]?.title,
      publicationYear: 2019,
      // Nothing has been resolved yet — that is what enrichment is for.
      citedArticleId: null,
    })
  })

  it('adopts the pre-allocated id and the object already stored under it', async () => {
    await runExtractStage(JOB, fakeServices({}))

    // The id the PDF was written under at upload time, so no object is ever
    // moved or copied (research/data-modeling/upload-jobs-schema.md).
    expect(recorded.article).toMatchObject({
      id: JOB.uploadJobId,
      userId: JOB.userId,
      pdfObjectKey: JOB.pdfObjectKey,
    })
    expect(recorded.jobUpdate).toMatchObject({ articleId: JOB.uploadJobId })
  })

  it('stores the extracted metadata and marks it GROBID-only', async () => {
    await runExtractStage(JOB, fakeServices({}))

    expect(recorded.article).toMatchObject({
      title: COMPLETE.title,
      authors: COMPLETE.authors,
      abstract: COMPLETE.abstract,
      publicationYear: 2024,
      venue: COMPLETE.venue,
      doi: COMPLETE.identifiers.doi,
      // A complete outcome, not a placeholder: enrichment upgrades it to
      // `enriched`, and an article that never gets there is still done.
      extractionStatus: 'grobid_only',
    })
    // Reading status is left to the column default, `pending`.
    expect(recorded.article).not.toHaveProperty('status')
  })

  it('can be replayed without disturbing what the user owns', async () => {
    await runExtractStage(JOB, fakeServices({}))

    // A crash between the commit and pg-boss recording the job complete replays
    // the whole stage, so the insert has to be repeatable. Notes and reading
    // status are the user's, and extraction must not reset them.
    expect(recorded.articleOnConflict).toBeDefined()
    expect(recorded.articleOnConflict).not.toHaveProperty('notes')
    expect(recorded.articleOnConflict).not.toHaveProperty('status')
  })
})

describe('a document GROBID could not extract', () => {
  /** The reason written to the job row, whatever produced it. */
  function failureReason(): unknown {
    return recorded.jobUpdate?.['failureReason']
  }

  it('still creates the article, with the decided fallbacks', async () => {
    await runExtractStage(
      JOB,
      fakeServices({
        extract: async () => {
          throw new ExtractionFailedError("couldn't read this PDF")
        },
      }),
    )

    // The property #11 depends on: a failed job always has an article behind
    // it, so the popup's failed row has something to open.
    expect(recorded.article).toMatchObject({
      id: JOB.uploadJobId,
      title: FILENAME,
      authors: [],
      extractionStatus: 'failed',
    })
  })

  it('resolves the job as failed and leaves its row standing', async () => {
    await runExtractStage(
      JOB,
      fakeServices({
        extract: async () => {
          throw new ExtractionFailedError("couldn't read this PDF")
        },
      }),
    )

    expect(recorded.jobUpdate).toMatchObject({
      status: 'failed',
      failureReason: "couldn't read this PDF",
    })
    // No finalize: deleting the row would take away the only thing telling the
    // user this upload needs them.
    expect(recorded.sent).toEqual([])
  })

  it.each([
    [
      'no authors',
      { ...COMPLETE, authors: [] },
      "couldn't find authors",
      { title: COMPLETE.title, authors: [] },
    ],
    [
      'no title',
      { ...COMPLETE, title: null },
      "couldn't find a title",
      { title: FILENAME, authors: COMPLETE.authors },
    ],
    [
      'neither',
      { ...COMPLETE, title: null, authors: [] },
      "couldn't find a title or authors",
      { title: FILENAME, authors: [] },
    ],
  ])('fails a document with %s, keeping whatever did parse', async (_case, metadata, reason, expected) => {
    await runExtractStage(
      JOB,
      fakeServices({ extract: async () => metadata as ExtractedMetadata }),
    )

    expect(failureReason()).toBe(reason)
    expect(recorded.article).toMatchObject({
      ...expected,
      // Everything else that parsed is still worth having: an article the
      // user has to name is more use than an empty one.
      abstract: COMPLETE.abstract,
      publicationYear: 2024,
      extractionStatus: 'failed',
    })
  })

  it('accepts a paper with no venue, DOI or abstract', async () => {
    // The absences a preprint has by nature. Requiring any of them would fail
    // most of this collection.
    await runExtractStage(
      JOB,
      fakeServices({
        extract: async () => ({
          ...COMPLETE,
          venue: null,
          identifiers: NO_IDENTIFIERS,
          abstract: null,
        }),
      }),
    )

    expect(recorded.article).toMatchObject({ extractionStatus: 'grobid_only' })
    expect(recorded.sent[0]?.queue).toBe('lit-tracker.enrich')
    // Nothing to look it up by, so enrichment will have to try the title.
    expect(recorded.sent[0]?.job).toMatchObject({ articleLookupKey: null })
  })
})

describe('a failure that might not repeat', () => {
  it('propagates, so pg-boss retries it', async () => {
    const services = fakeServices({
      extract: async () => {
        throw new Error('GROBID returned 503: no engine available')
      },
    })

    await expect(runExtractStage(JOB, services)).rejects.toThrow(/503/)
    // Nothing was written: a transient failure must not reach the reactive
    // status column, because the job has not reached a terminal outcome yet.
    expect(recorded.article).toBeUndefined()
    expect(recorded.jobUpdate).toBeUndefined()
  })

  it('resolves the job once pg-boss has exhausted its retries', async () => {
    // Otherwise "transient" would mean "forever": a GROBID down past the
    // backoff would leave the row spinning with no article behind it.
    await runExhaustedExtractStage(JOB, fakeServices({}))

    expect(recorded.article).toMatchObject({
      title: FILENAME,
      authors: [],
      extractionStatus: 'failed',
    })
    expect(recorded.jobUpdate).toMatchObject({ status: 'failed' })
    // The reason names the service, not the file — the PDF may be perfectly
    // good.
    expect(recorded.jobUpdate?.['failureReason']).not.toMatch(/PDF/i)
    expect(recorded.sent).toEqual([])
  })
})

describe('a job with nothing left to work on', () => {
  it('does nothing when the upload row is gone', async () => {
    // The account was deleted, or #11 removed the article and cascaded the row
    // away, while this job sat in the queue. Re-creating it would resurrect
    // data the user asked to remove.
    await runExtractStage(JOB, fakeServices({ uploadJob: undefined }))

    expect(recorded.steps).toEqual(['load-job'])
    expect(recorded.article).toBeUndefined()
  })

  it('does not retry a PDF belonging to someone else', async () => {
    // Corrupt job data rather than a service failure: the read is refused
    // before any request, and repeating it would only be refused again.
    await runExtractStage(
      JOB,
      fakeServices({
        fetchPdf: async () => {
          throw new PdfOwnershipError(JOB.pdfObjectKey)
        },
      }),
    )

    expect(recorded.jobUpdate).toMatchObject({ status: 'failed' })
    expect(recorded.article).toMatchObject({ extractionStatus: 'failed' })
  })
})
