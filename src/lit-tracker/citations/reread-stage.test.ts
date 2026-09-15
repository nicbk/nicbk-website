// @vitest-environment node
//
// Server module: the doubles below stand in for Postgres, GROBID and Semantic
// Scholar. The same code runs against the real ones in
// citations.integration.test.ts.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import { articles, referenceReads } from '~/db/schema'
import { SemanticScholarUnavailableError } from '~/lit-tracker/enrichment/failure'
import { ExtractionFailedError } from '~/lit-tracker/extraction/failure'
import type { ExtractionServices } from '~/lit-tracker/extraction/services'
import type { ExtractedMetadata } from '~/lit-tracker/extraction/tei'

/**
 * The re-read's decisions, with the infrastructure replaced: what counts as
 * failed rather than retried, that every network call comes before any write,
 * and that the article write carries nothing a reader can edit.
 */

const edges = vi.hoisted(() => ({
  writeBibliography: vi.fn(),
  applyResolvedEdges: vi.fn(),
  addReferenceEdges: vi.fn(),
  dropMergedRows: vi.fn(),
}))
vi.mock('./edges', () => edges)

const {
  queueReferenceRereads,
  registerReferenceRereadHandlers,
  runExhaustedReferenceReread,
  runReferenceReread,
} = await import('./reread-stage')

const JOB = {
  articleId: '01930000-0000-7000-8000-0000000000aa',
  userId: 'user-a',
}

const METADATA = {
  bibliography: [
    {
      title: 'Layer Normalization',
      authors: [],
      publicationYear: 2016,
      venue: null,
      identifiers: { doi: null, arxivId: '1607.06450', pubmedId: null },
      raw: 'Ba. Layer Normalization. 2016.',
    },
  ],
} as unknown as ExtractedMetadata

interface Recorded {
  steps: string[]
  updates: { table: unknown; values: Record<string, unknown> }[]
  deletes: unknown[]
  sent: { queue: string; job: unknown; options: unknown }[]
}
let recorded: Recorded
/** Rows a `select … limit` answers with: whether anything is outstanding. */
let outstanding: unknown[]
/** Rows a plain `select` answers with: the re-reads waiting for a job. */
let waiting: unknown[]

function fakeDatabase(
  article:
    | { pdfObjectKey: string; semanticScholarId: string | null; userId: string }
    | undefined,
): DatabaseHandle {
  const update = (table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        recorded.updates.push({ table, values })
      },
    }),
  })
  const tx = {
    update,
    select: () => ({
      from: () => {
        const where = () =>
          Object.assign(Promise.resolve(waiting), {
            limit: async () => outstanding,
          })
        return { where }
      },
    }),
    delete: (table: unknown) => ({
      where: async () => {
        recorded.deletes.push(table)
      },
    }),
    execute: async () => ({
      rows: [
        { article_id: 'article-1', user_id: 'user-a' },
        { article_id: 'article-2', user_id: 'user-b' },
      ],
    }),
  }
  const db = {
    query: { articles: { findFirst: async () => article } },
    update,
    transaction: async (run: (tx: unknown) => Promise<unknown>) => {
      recorded.steps.push('write')
      return run(tx)
    },
  }
  return { db, pool: {} } as unknown as DatabaseHandle
}

function fakeServices(
  options: {
    article?: Parameters<typeof fakeDatabase>[0]
    extract?: () => Promise<ExtractedMetadata>
    lookup?: () => Promise<Map<string, unknown>>
  } = {},
): ExtractionServices {
  const article =
    'article' in options
      ? options.article
      : {
          pdfObjectKey: 'key',
          semanticScholarId: 's2-paper',
          userId: JOB.userId,
        }
  return {
    database: fakeDatabase(article),
    queue: {
      send: vi.fn(async (queue: string, job: unknown, sendOptions: unknown) => {
        recorded.sent.push({ queue, job, options: sendOptions })
        return 'job-id'
      }),
    } as never,
    fetchPdf: async () => {
      recorded.steps.push('pdf')
      return new Uint8Array()
    },
    extractMetadata:
      options.extract ??
      (async () => {
        recorded.steps.push('grobid')
        return METADATA
      }),
    lookupPapers:
      (options.lookup as ExtractionServices['lookupPapers']) ??
      (async () => {
        recorded.steps.push('lookup')
        return new Map([
          ['s2-paper', { paperId: 's2-paper', referenceCount: 40 }],
          [
            'ARXIV:1607.06450',
            { paperId: 's2-layernorm', title: 'Layer Normalization' },
          ],
        ]) as never
      }),
    matchPaperByTitle: async () => null,
    fetchReferences: async () => {
      recorded.steps.push('references')
      return []
    },
  }
}

beforeEach(() => {
  recorded = { steps: [], updates: [], deletes: [], sent: [] }
  outstanding = []
  waiting = []
  vi.clearAllMocks()
  edges.writeBibliography.mockResolvedValue([
    {
      id: 'edge-1',
      citedArticleId: null,
      identifiers: { doi: null, arxivId: '1607.06450', pubmedId: null },
    },
  ])
})

describe('queueReferenceRereads', () => {
  it('sends a job for every paper waiting, keyed by paper, and counts the new ones', async () => {
    const services = fakeServices()
    waiting = [
      { article_id: 'article-1', user_id: 'user-a' },
      { article_id: 'article-2', user_id: 'user-b' },
    ]

    await expect(
      queueReferenceRereads(services.database, services.queue),
    ).resolves.toBe(2)

    expect(recorded.sent).toEqual([
      {
        queue: 'lit-tracker.reread-references',
        job: { articleId: 'article-1', userId: 'user-a' },
        options: expect.objectContaining({ singletonKey: 'article-1' }),
      },
      {
        queue: 'lit-tracker.reread-references',
        job: { articleId: 'article-2', userId: 'user-b' },
        options: expect.objectContaining({ singletonKey: 'article-2' }),
      },
    ])
  })
})

describe('runReferenceReread', () => {
  it('calls GROBID and Semantic Scholar before writing anything', async () => {
    await runReferenceReread(JOB, fakeServices())

    expect(recorded.steps).toEqual([
      'pdf',
      'grobid',
      'lookup',
      'references',
      'write',
    ])
  })

  it('rewrites the bibliography and resolves it', async () => {
    await runReferenceReread(JOB, fakeServices())

    const citing = { articleId: JOB.articleId, userId: JOB.userId }
    expect(edges.writeBibliography).toHaveBeenCalledWith(
      expect.anything(),
      citing,
      METADATA.bibliography,
    )
    expect(edges.applyResolvedEdges).toHaveBeenCalledWith(
      expect.anything(),
      citing,
      [
        expect.objectContaining({
          edgeId: 'edge-1',
          semanticScholarId: 's2-layernorm',
        }),
      ],
    )
    expect(edges.dropMergedRows).toHaveBeenCalledWith(
      expect.anything(),
      JOB.articleId,
    )
  })

  it('writes only the count and the read marker to the article', async () => {
    await runReferenceReread(JOB, fakeServices())

    const article = recorded.updates.find((update) => update.table === articles)
    expect(Object.keys(article?.values ?? {}).sort()).toEqual([
      'referenceCount',
      'referencesReadAt',
      'updatedAt',
    ])
    expect(article?.values['referenceCount']).toBe(40)
  })

  it('marks the paper done and clears a batch with nothing left outstanding', async () => {
    await runReferenceReread(JOB, fakeServices())

    expect(recorded.updates).toContainEqual({
      table: referenceReads,
      values: { status: 'done' },
    })
    expect(recorded.deletes).toEqual([referenceReads])
  })

  it('keeps the batch while another paper is still outstanding', async () => {
    outstanding = [{ articleId: 'another' }]

    await runReferenceReread(JOB, fakeServices())

    expect(recorded.deletes).toEqual([])
  })

  it('asks nothing of Semantic Scholar’s reference list for a paper it never matched', async () => {
    await runReferenceReread(
      JOB,
      fakeServices({
        article: {
          pdfObjectKey: 'key',
          semanticScholarId: null,
          userId: JOB.userId,
        },
      }),
    )

    expect(recorded.steps).not.toContain('references')
    const article = recorded.updates.find((update) => update.table === articles)
    expect(article?.values).not.toHaveProperty('referenceCount')
  })

  it('marks the paper failed, and writes nothing, when GROBID cannot read it', async () => {
    await runReferenceReread(
      JOB,
      fakeServices({
        extract: async () => {
          throw new ExtractionFailedError("couldn't read this PDF")
        },
      }),
    )

    expect(recorded.steps).not.toContain('write')
    expect(recorded.updates).toEqual([
      { table: referenceReads, values: { status: 'failed' } },
    ])
  })

  it('throws, writing nothing, when Semantic Scholar is away', async () => {
    await expect(
      runReferenceReread(
        JOB,
        fakeServices({
          lookup: async () => {
            throw new SemanticScholarUnavailableError('429')
          },
        }),
      ),
    ).rejects.toThrow(SemanticScholarUnavailableError)

    expect(recorded.steps).not.toContain('write')
    expect(recorded.updates).toEqual([])
  })

  it('fills in what the printed identifiers could not, from the reference list', async () => {
    // What the select for unresolved edges answers with, once written.
    waiting = [
      {
        id: 'edge-2',
        title:
          'Dropout: a simple way to prevent neural networks from overfitting. JMLR',
      },
    ]
    const services = fakeServices()
    services.fetchReferences = async () => [
      {
        paperId: 's2-dropout',
        title:
          'Dropout: A Simple Way to Prevent Neural Networks from Overfitting',
        authors: null,
        year: 2014,
      },
      {
        paperId: 's2-unclaimed',
        title: 'A Reference Only The List Had',
        authors: null,
        year: null,
      },
    ]

    await runReferenceReread(JOB, services)

    const [, , applied] = edges.applyResolvedEdges.mock.calls[0] ?? []
    expect(applied).toContainEqual(
      expect.objectContaining({
        edgeId: 'edge-2',
        semanticScholarId: 's2-dropout',
      }),
    )
    expect(edges.addReferenceEdges).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [expect.objectContaining({ paperId: 's2-unclaimed' })],
    )
  })

  it('asks to be retried when the stored PDF cannot be fetched right now', async () => {
    const services = fakeServices()
    services.fetchPdf = async () => {
      throw new Error('Garage is restarting')
    }

    await expect(runReferenceReread(JOB, services)).rejects.toThrow(
      'Garage is restarting',
    )
    expect(recorded.updates).toEqual([])
  })

  it('does nothing for a paper deleted while it waited', async () => {
    await runReferenceReread(JOB, fakeServices({ article: undefined }))

    expect(recorded.steps).toEqual([])
  })

  it('does nothing for a paper that is not the job’s user’s', async () => {
    await runReferenceReread(
      JOB,
      fakeServices({
        article: {
          pdfObjectKey: 'key',
          semanticScholarId: null,
          userId: 'someone-else',
        },
      }),
    )

    expect(recorded.steps).toEqual([])
  })
})

describe('runExhaustedReferenceReread', () => {
  it('marks the paper failed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await runExhaustedReferenceReread(JOB, fakeServices())

    expect(recorded.updates).toEqual([
      { table: referenceReads, values: { status: 'failed' } },
    ])
  })
})

describe('registerReferenceRereadHandlers', () => {
  it('binds the re-read and its dead letter', async () => {
    const work = vi.fn(async (_name: string, _handler: unknown) => 'worker-id')

    await registerReferenceRereadHandlers({ work } as never, fakeServices())

    expect(work.mock.calls.map(([name]) => name)).toEqual([
      'lit-tracker.reread-references',
      'lit-tracker.reread-references-exhausted',
    ])
  })

  it('runs each handler on the jobs it is given', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const work = vi.fn(
      async (
        _name: string,
        _handler: (jobs: { data: unknown }[]) => Promise<void>,
      ) => 'worker-id',
    )
    await registerReferenceRereadHandlers({ work } as never, fakeServices())
    const [reread, exhausted] = work.mock.calls.map(([, handler]) => handler)

    await reread?.([{ data: JOB }])
    await exhausted?.([{ data: JOB }])

    expect(recorded.steps).toContain('write')
    expect(recorded.updates).toContainEqual({
      table: referenceReads,
      values: { status: 'failed' },
    })
  })
})
