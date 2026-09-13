// @vitest-environment node
import type { PgBoss } from 'pg-boss'
import { describe, expect, it, vi } from 'vitest'
import type { PdfCleanupServices } from './cleanup-stage'
import { registerPdfCleanupHandler, runPdfCleanupStage } from './cleanup-stage'

/**
 * The stage that takes a deleted article's PDF out of the bucket.
 *
 * What a real Garage does with the request is
 * `src/storage/pdf-storage.test.ts`'s and the integration tier's; this is about
 * which object the job names, and where the name comes from.
 */

const USER = 'reader-1'
const ARTICLE = '0199a1b2-c3d4-7e5f-8a9b-000000000001'

function servicesWith(deletePdf: PdfCleanupServices['deletePdf']) {
  return { deletePdf }
}

describe('runPdfCleanupStage', () => {
  it('deletes the object belonging to the article it names', async () => {
    const deletePdf = vi.fn(async () => {})

    await runPdfCleanupStage(
      { userId: USER, articleId: ARTICLE },
      servicesWith(deletePdf),
    )

    // The decided layout, derived rather than carried: a key in the payload
    // could name any object in the bucket, and this row is written by a
    // request a client initiated.
    expect(deletePdf).toHaveBeenCalledWith(
      `lit-tracker/${USER}/${ARTICLE}/source.pdf`,
      USER,
    )
  })

  it('succeeds when the object is already gone', async () => {
    // The retry case, and the reason the whole cleanup can be retried at all:
    // pg-boss will run this again after any partial failure, and a second run
    // must be a success rather than a job that fails forever.
    const deletePdf = vi.fn(async () => {})

    await runPdfCleanupStage(
      { userId: USER, articleId: ARTICLE },
      servicesWith(deletePdf),
    )
    await expect(
      runPdfCleanupStage(
        { userId: USER, articleId: ARTICLE },
        servicesWith(deletePdf),
      ),
    ).resolves.toBeUndefined()
  })

  it('lets a real failure through, so the job is retried', async () => {
    // The opposite of the case above, and the line between them is the whole
    // retry policy: "already gone" is done, "Garage is down" is not.
    const deletePdf = vi.fn(async () => {
      throw new Error('connection refused')
    })

    await expect(
      runPdfCleanupStage(
        { userId: USER, articleId: ARTICLE },
        servicesWith(deletePdf),
      ),
    ).rejects.toThrow('connection refused')
  })
})

describe('registerPdfCleanupHandler', () => {
  it('binds the cleanup to its own queue', async () => {
    const work = vi.fn(async (_name: string, _handler: unknown) => 'worker-id')

    await registerPdfCleanupHandler(
      { work } as unknown as PgBoss,
      servicesWith(vi.fn(async () => {})),
    )

    expect(work.mock.calls.map(([name]) => name)).toEqual([
      'lit-tracker.pdf-cleanup',
    ])
  })

  it('hands each job in a batch to the stage', async () => {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<void>>()
    const work = vi.fn(
      async (name: string, handler: (jobs: unknown[]) => Promise<void>) => {
        handlers.set(name, handler)
        return 'worker-id'
      },
    )
    const deletePdf = vi.fn(async () => {})

    await registerPdfCleanupHandler(
      { work } as unknown as PgBoss,
      servicesWith(deletePdf),
    )
    // pg-boss hands a worker an array even at the default batch size of one.
    await handlers.get('lit-tracker.pdf-cleanup')?.([
      { data: { userId: USER, articleId: ARTICLE } },
      { data: { userId: USER, articleId: 'another-article' } },
    ])

    expect(deletePdf).toHaveBeenCalledTimes(2)
  })
})
