import { describe, expect, it, vi } from 'vitest'
import { articleContents } from '~/db/schema'
import { ExtractionFailedError } from '~/lit-tracker/extraction/failure'
import type { ExtractionServices } from '~/lit-tracker/extraction/services'
import type { ExtractedMetadata } from '~/lit-tracker/extraction/tei'
import { PdfOwnershipError } from '~/storage/pdf-storage'
import {
  queueContentsReads,
  registerContentsReadHandlers,
  runContentsRead,
  runExhaustedContentsRead,
} from './read-stage'

/**
 * The backfill's decisions, with the database and services stood in for:
 * what is read, in what order, and what is written. Selecting the papers to
 * queue is SQL, and is the integration tier's to check against real Postgres.
 */

const JOB = { articleId: 'article-1', userId: 'user-1' }
const entry = (title: string) => ({ title, depth: 1, pageIndex: 0, top: null })
const OUTLINE = [entry('1 Introduction'), entry('2 Method')]
const HEADINGS = [entry('1 Introduction')]

interface Recorded {
  steps: string[]
  written: Record<string, unknown> | undefined
  conflictTarget: unknown
}

function services(
  options: {
    article?: { pdfObjectKey: string; userId: string } | undefined
    fetchPdf?: () => Promise<Uint8Array>
    outline?: () => Promise<typeof OUTLINE>
    extract?: () => Promise<Pick<ExtractedMetadata, 'headings'>>
  } = {},
) {
  const recorded: Recorded = {
    steps: [],
    written: undefined,
    conflictTarget: undefined,
  }
  const db = {
    query: {
      articles: {
        findFirst: async () =>
          'article' in options
            ? options.article
            : { pdfObjectKey: 'key', userId: JOB.userId },
      },
    },
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: async ({ target }: { target: unknown }) => {
          expect(table).toBe(articleContents)
          recorded.steps.push('write')
          recorded.written = values
          recorded.conflictTarget = target
        },
      }),
    }),
  }
  const fake = {
    database: { db, pool: {} },
    fetchPdf:
      options.fetchPdf ??
      (async () => {
        recorded.steps.push('pdf')
        return new Uint8Array()
      }),
    readOutline:
      options.outline ??
      (async () => {
        recorded.steps.push('outline')
        return []
      }),
    extractMetadata:
      options.extract ??
      (async () => {
        recorded.steps.push('grobid')
        return { headings: HEADINGS }
      }),
  } as unknown as ExtractionServices
  return { services: fake, recorded }
}

describe('runContentsRead', () => {
  // Most papers with an outline — and every book with one — cost no GROBID call.
  it('keeps a usable outline without asking GROBID', async () => {
    const { services: s, recorded } = services({
      outline: async () => {
        recorded.steps.push('outline')
        return OUTLINE
      },
    })
    await runContentsRead(JOB, s)
    expect(recorded.steps).toEqual(['pdf', 'outline', 'write'])
    expect(recorded.written).toEqual({
      ...JOB,
      source: 'outline',
      entries: OUTLINE,
    })
  })

  it('asks GROBID for headings when there is no usable outline', async () => {
    const { services: s, recorded } = services()
    await runContentsRead(JOB, s)
    expect(recorded.steps).toEqual(['pdf', 'outline', 'grobid', 'write'])
    expect(recorded.written).toMatchObject({
      source: 'headings',
      entries: HEADINGS,
    })
  })

  it('records none when neither source has any', async () => {
    const { services: s, recorded } = services({
      extract: async () => ({ headings: [] }),
    })
    await runContentsRead(JOB, s)
    expect(recorded.written).toMatchObject({ source: 'none', entries: [] })
  })

  it('records a failure when the PDF cannot be read and GROBID has nothing', async () => {
    const { services: s, recorded } = services({
      outline: async () => {
        throw new Error('pdfium could not open it')
      },
      extract: async () => {
        throw new ExtractionFailedError('unreadable', 'bad pdf')
      },
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await runContentsRead(JOB, s)
    expect(recorded.written).toMatchObject({ source: 'failed', entries: [] })
  })

  // A GROBID that is down is retried by the queue, not recorded as a failure.
  it('throws on a passing GROBID failure, so the job is retried', async () => {
    const { services: s, recorded } = services({
      extract: async () => {
        throw new Error('no engine available')
      },
    })
    await expect(runContentsRead(JOB, s)).rejects.toThrow('no engine available')
    expect(recorded.written).toBeUndefined()
  })

  it('records a failure for a PDF the job does not own', async () => {
    const { services: s, recorded } = services({
      fetchPdf: async () => {
        throw new PdfOwnershipError('key')
      },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await runContentsRead(JOB, s)
    expect(recorded.written).toMatchObject({ source: 'failed' })
  })

  it('retries when the stored PDF is briefly unreachable', async () => {
    const { services: s } = services({
      fetchPdf: async () => {
        throw new Error('garage restarting')
      },
    })
    await expect(runContentsRead(JOB, s)).rejects.toThrow('garage restarting')
  })

  it('does nothing for a paper deleted while its job waited', async () => {
    const { services: s, recorded } = services({ article: undefined })
    await runContentsRead(JOB, s)
    expect(recorded.steps).toEqual([])
  })

  it('does nothing for a paper that is not this user’s', async () => {
    const { services: s, recorded } = services({
      article: { pdfObjectKey: 'key', userId: 'someone-else' },
    })
    await runContentsRead(JOB, s)
    expect(recorded.steps).toEqual([])
  })

  // The upload may have read the paper while the job waited.
  it('never writes over contents already there', async () => {
    const { services: s, recorded } = services()
    await runContentsRead(JOB, s)
    expect(recorded.conflictTarget).toBe(articleContents.articleId)
  })
})

describe('runExhaustedContentsRead', () => {
  it('records the paper as one whose contents could not be read', async () => {
    const { services: s, recorded } = services()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await runExhaustedContentsRead(JOB, s)
    expect(recorded.written).toEqual({ ...JOB, source: 'failed', entries: [] })
  })
})

describe('queueContentsReads', () => {
  it('sends one job per paper without contents, keyed by the paper', async () => {
    const send = vi.fn(async () => 'job-id')
    const tx = {
      execute: async () => ({
        rows: [
          { id: 'a', user_id: 'u' },
          { id: 'b', user_id: 'u' },
        ],
      }),
    }
    const database = {
      db: {
        transaction: async (run: (t: unknown) => Promise<number>) => run(tx),
      },
      pool: {},
    }

    const queued = await queueContentsReads(
      database as never,
      { send } as never,
    )

    expect(queued).toBe(2)
    expect(send).toHaveBeenCalledWith(
      'lit-tracker.read-contents',
      { articleId: 'a', userId: 'u' },
      expect.objectContaining({ singletonKey: 'a' }),
    )
    expect(send).toHaveBeenCalledTimes(2)
  })
})

describe('registerContentsReadHandlers', () => {
  it('binds the read and its dead letter, each to the jobs it is given', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const work = vi.fn(
      async (
        _name: string,
        _handler: (jobs: { data: unknown }[]) => Promise<void>,
      ) => 'worker-id',
    )
    const { services: s, recorded } = services()

    await registerContentsReadHandlers({ work } as never, s)

    expect(work.mock.calls.map(([name]) => name)).toEqual([
      'lit-tracker.read-contents',
      'lit-tracker.read-contents-exhausted',
    ])
    const [read, exhausted] = work.mock.calls.map(([, handler]) => handler)
    await read?.([{ data: JOB }])
    expect(recorded.steps).toEqual(['pdf', 'outline', 'grobid', 'write'])
    await exhausted?.([{ data: JOB }])
    expect(recorded.written).toEqual({ ...JOB, source: 'failed', entries: [] })
  })
})
