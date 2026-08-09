// @vitest-environment node
//
// Server module: the doubles below stand in for Postgres and Semantic Scholar.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatabaseHandle } from '~/db/create-database'
import type { SemanticScholarPaper } from '~/lit-tracker/enrichment/client'
import { SemanticScholarUnavailableError } from '~/lit-tracker/enrichment/failure'
import type { EnrichJob } from '~/lit-tracker/jobs/queue'
import { runEnrichStage, runExhaustedEnrichStage } from './enrich-stage'
import type { ExtractionServices } from './services'

/**
 * The enrich stage's decisions, with the infrastructure replaced.
 *
 * One property dominates this file: **nothing here may fail an upload**.
 * Semantic Scholar is a public API shared with every other unauthenticated
 * caller and throttled by whatever load it is under; the decided behaviour is
 * that it can be unavailable without a user ever finding out. The tests below
 * are mostly different ways of asking whether that still holds.
 *
 * The second is the request budget. One batch call covers the paper and its
 * whole bibliography; a second happens only when the paper carried no
 * identifier. A stage that quietly resolved references one at a time would
 * still pass every behavioural test and be unusable in production.
 */

const JOB: EnrichJob = {
  uploadJobId: '01930000-0000-7000-8000-0000000000aa',
  userId: 'user-a',
  articleId: '01930000-0000-7000-8000-0000000000aa',
  articleLookupKey: 'ARXIV:1706.03762',
  edgeLookups: [
    { edgeId: '01930000-0000-7000-8000-00000000ed01', key: 'DOI:10.1/first' },
    { edgeId: '01930000-0000-7000-8000-00000000ed02', key: 'ARXIV:1607.06450' },
  ],
}

/** The article as extraction left it: GROBID's reading of the PDF. */
const ARTICLE = {
  title: 'Attention Is All You Need',
  authors: [{ name: 'Ashish Vaswani', given: 'Ashish', family: 'Vaswani' }],
  // The stamp on the revision that was downloaded, not the paper's own year.
  publicationYear: 2023,
  venue: null,
  doi: null,
  abstract: 'The dominant sequence transduction models...',
}

const PAPER: SemanticScholarPaper = {
  paperId: '204e3073870fae3d05bcbc2f6a8e263d9b72e776',
  title: 'Attention is All you Need',
  abstract: null,
  year: 2017,
  venue: 'Neural Information Processing Systems',
  externalIds: { ArXiv: '1706.03762' },
  authors: [{ name: 'Ashish Vaswani' }],
}

interface Recorded {
  articleUpdate: Record<string, unknown> | undefined
  edgeUpdates: Record<string, unknown>[]
  sent: { queue: string; job: unknown }[]
  lookedUp: string[][]
  titleQueries: string[]
}

let recorded: Recorded

function fakeDatabase(article: typeof ARTICLE | undefined): DatabaseHandle {
  const tx = {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          const done = Promise.resolve().then(() => {
            // The article and the edges are updated through the same builder,
            // so they are told apart by which columns were set.
            if ('extractionStatus' in values) {
              recorded.articleUpdate = values
            } else {
              recorded.edgeUpdates.push(values)
            }
          })
          return Object.assign(done, {
            returning: async () => {
              await done
              return []
            },
          })
        },
      }),
    }),
    select: () => ({ from: () => ({ where: async () => [] }) }),
  }

  const db = {
    query: {
      articles: { findFirst: async () => article },
    },
    transaction: async (run: (tx: unknown) => Promise<void>) => {
      await run(tx)
    },
  }
  return { db, pool: {} } as unknown as DatabaseHandle
}

function fakeServices(
  options: {
    article?: typeof ARTICLE | undefined
    papers?: Map<string, SemanticScholarPaper>
    lookup?: () => Promise<Map<string, SemanticScholarPaper>>
    match?: () => Promise<SemanticScholarPaper | null>
  } = {},
): ExtractionServices {
  return {
    database: fakeDatabase('article' in options ? options.article : ARTICLE),
    queue: {
      send: vi.fn(async (queue: string, job: unknown) => {
        recorded.sent.push({ queue, job })
        return 'job-id'
      }),
    } as unknown as ExtractionServices['queue'],
    fetchPdf: async () => {
      throw new Error('the enrich stage must not read the PDF again')
    },
    extractMetadata: async () => {
      throw new Error('the enrich stage must not call GROBID again')
    },
    lookupPapers:
      options.lookup ??
      (async (keys: string[]) => {
        recorded.lookedUp.push(keys)
        return (
          options.papers ?? new Map([[JOB.articleLookupKey as string, PAPER]])
        )
      }),
    matchPaperByTitle:
      options.match ??
      (async (title: string) => {
        recorded.titleQueries.push(title)
        return null
      }),
  }
}

beforeEach(() => {
  recorded = {
    articleUpdate: undefined,
    edgeUpdates: [],
    sent: [],
    lookedUp: [],
    titleQueries: [],
  }
})

describe('a successful enrichment', () => {
  it('resolves the paper and its whole bibliography in one request', async () => {
    await runEnrichStage(JOB, fakeServices())

    // The uploaded paper and every reference that had an identifier go in
    // together. Resolving them separately is the obvious implementation and
    // the one that gets this pipeline throttled.
    expect(recorded.lookedUp).toEqual([
      ['ARXIV:1706.03762', 'DOI:10.1/first', 'ARXIV:1607.06450'],
    ])
    expect(recorded.titleQueries).toEqual([])
  })

  it('records the Semantic Scholar id and promotes the article', async () => {
    await runEnrichStage(JOB, fakeServices())

    expect(recorded.articleUpdate).toMatchObject({
      semanticScholarId: PAPER.paperId,
      extractionStatus: 'enriched',
    })
  })

  it('fills in the venue and corrects the year', async () => {
    await runEnrichStage(JOB, fakeServices())

    expect(recorded.articleUpdate).toMatchObject({
      venue: 'Neural Information Processing Systems',
      // GROBID read 2023 off the arXiv revision stamp; the paper is from 2017,
      // and an arXiv id names one paper and cannot be a coincidence.
      publicationYear: 2017,
    })
  })

  it('attaches an id to each reference the API recognised', async () => {
    await runEnrichStage(
      JOB,
      fakeServices({
        papers: new Map([
          ['DOI:10.1/first', { ...PAPER, paperId: 'first-paper' }],
          // The second reference is one Semantic Scholar has never heard of —
          // an ordinary outcome, not a failure.
        ]),
      }),
    )

    expect(recorded.edgeUpdates).toEqual([
      expect.objectContaining({ semanticScholarId: 'first-paper' }),
    ])
  })

  it('hands the upload on to finalize', async () => {
    await runEnrichStage(JOB, fakeServices())

    expect(recorded.sent).toEqual([
      { queue: 'lit-tracker.finalize', job: { uploadJobId: JOB.uploadJobId } },
    ])
  })
})

describe('a paper with no identifier', () => {
  const noKey: EnrichJob = { ...JOB, articleLookupKey: null, edgeLookups: [] }

  it('falls back to a title search, once', async () => {
    await runEnrichStage(
      noKey,
      fakeServices({ match: async () => ({ ...PAPER, title: ARTICLE.title }) }),
    )

    expect(recorded.articleUpdate).toMatchObject({
      semanticScholarId: PAPER.paperId,
    })
  })

  it('refuses a title match that does not actually agree', async () => {
    // The API returns its *closest* match and a score with no documented
    // threshold, so a nonsense query still comes back with something plausible.
    // A wrong id here would then silently drive every graduation decision.
    await runEnrichStage(
      noKey,
      fakeServices({
        match: async () => ({
          ...PAPER,
          title: 'A Completely Unrelated Paper',
          authors: [{ name: 'Someone Else' }],
        }),
      }),
    )

    expect(recorded.articleUpdate).toBeUndefined()
    // Still finalized: no match is not a failure.
    expect(recorded.sent[0]?.queue).toBe('lit-tracker.finalize')
  })

  it('does not overwrite what GROBID read, on a title match', async () => {
    await runEnrichStage(
      noKey,
      fakeServices({ match: async () => ({ ...PAPER, title: ARTICLE.title }) }),
    )

    // A title match is a guess, however good. It may fill the empty venue; it
    // may not correct a year read off the document.
    expect(recorded.articleUpdate).toMatchObject({
      publicationYear: 2023,
      venue: 'Neural Information Processing Systems',
    })
  })
})

describe('when Semantic Scholar is unavailable', () => {
  it('throws, so pg-boss retries it later', async () => {
    const services = fakeServices({
      lookup: async () => {
        throw new SemanticScholarUnavailableError('429 after backoff')
      },
    })

    await expect(runEnrichStage(JOB, services)).rejects.toBeInstanceOf(
      SemanticScholarUnavailableError,
    )
    // Nothing was written and nothing was finalized: the job has not reached a
    // terminal outcome, and the article is already readable meanwhile.
    expect(recorded.articleUpdate).toBeUndefined()
    expect(recorded.sent).toEqual([])
  })

  it('finalizes the upload anyway once the retries run out', async () => {
    // The whole of "enrichment is non-fatal". Without this the upload would
    // spin in the status popup forever with a perfectly good article behind it.
    await runExhaustedEnrichStage(JOB, fakeServices())

    expect(recorded.sent).toEqual([
      { queue: 'lit-tracker.finalize', job: { uploadJobId: JOB.uploadJobId } },
    ])
    // Left `grobid_only`, which is a success state and not a failure.
    expect(recorded.articleUpdate).toBeUndefined()
  })

  it('never marks the job failed, whatever went wrong', async () => {
    const services = fakeServices({
      lookup: async () => {
        throw new SemanticScholarUnavailableError('the request timed out')
      },
    })

    await expect(runEnrichStage(JOB, services)).rejects.toThrow()
    await runExhaustedEnrichStage(JOB, services)

    // The property the decision actually protects: `upload_jobs.status` is only
    // ever written by extraction, and enrichment has no path to `failed`.
    expect(
      recorded.sent.every((sent) => sent.queue === 'lit-tracker.finalize'),
    ).toBe(true)
  })
})

describe('an article that is no longer there', () => {
  it('does nothing when it was deleted while the job waited', async () => {
    // Removed by #11, or with the account. There is nothing to enrich, and no
    // upload row left to finalize either.
    await runEnrichStage(JOB, fakeServices({ article: undefined }))

    expect(recorded.lookedUp).toEqual([])
    expect(recorded.sent).toEqual([])
  })
})
