// @vitest-environment node
import type { PgBoss } from 'pg-boss'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExtractionServices } from './services'

/**
 * The wiring: which queue runs which stage, and the fact that the worker keeps
 * trying to start.
 *
 * Both are invisible when wrong — every queue exists, every handler runs, and
 * the only symptom is uploads that never resolve. The stages themselves are
 * tested in their own files.
 */

const getQueue = vi.hoisted(() => vi.fn())
vi.mock('~/lit-tracker/jobs/queue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lit-tracker/jobs/queue')>()),
  getQueue,
}))

const { registerExtractionHandlers, startExtractionWorker } = await import(
  './worker'
)

describe('registerExtractionHandlers', () => {
  it('binds a handler to every queue in the chain', async () => {
    const work = vi.fn(async (_name: string, _handler: unknown) => 'worker-id')
    const services = {} as ExtractionServices

    await registerExtractionHandlers({ work } as unknown as PgBoss, services)

    expect(work.mock.calls.map(([name]) => name)).toEqual([
      'lit-tracker.extract',
      // The dead-letter queue needs a handler as much as the others do: an
      // unhandled one would collect jobs nobody ever resolves.
      'lit-tracker.extract-exhausted',
      'lit-tracker.finalize',
    ])
  })

  it('hands each job in a batch to its stage', async () => {
    const handlers = new Map<string, (jobs: unknown[]) => Promise<void>>()
    const work = vi.fn(
      async (name: string, handler: (jobs: unknown[]) => Promise<void>) => {
        handlers.set(name, handler)
        return 'worker-id'
      },
    )
    const deleted: string[] = []
    const services = {
      database: {
        db: {
          delete: () => ({
            where: async () => {
              deleted.push('deleted')
            },
          }),
        },
      },
    } as unknown as ExtractionServices

    await registerExtractionHandlers({ work } as unknown as PgBoss, services)
    // pg-boss hands a worker an array even at the default batch size of one.
    await handlers.get('lit-tracker.finalize')?.([
      { data: { uploadJobId: 'a' } },
      { data: { uploadJobId: 'b' } },
    ])

    expect(deleted).toHaveLength(2)
  })
})

describe('startExtractionWorker', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps trying until the queue is reachable', async () => {
    // The behaviour the whole feature rests on when a deploy brings the app up
    // before Postgres: a worker that gave up after one failed connection would
    // look exactly like a working one, until an upload never resolved.
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const work = vi.fn(async (_name: string, _handler: unknown) => 'worker-id')
    getQueue
      .mockRejectedValueOnce(
        Object.assign(new Error(''), { code: 'ECONNREFUSED' }),
      )
      .mockResolvedValue({ work })

    const started = startExtractionWorker()
    // The retry is scheduled, not immediate; nothing is bound yet.
    expect(work).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5_000)
    await started

    expect(getQueue).toHaveBeenCalledTimes(2)
    expect(work).toHaveBeenCalledTimes(3)
  })

  it('starts only once, however many times it is called', async () => {
    // The dev server re-evaluates the entry on reload, and duplicate workers
    // would each hold a connection and fetch from the same queues.
    const first = startExtractionWorker()

    expect(startExtractionWorker()).toBe(first)
    await first
  })
})
