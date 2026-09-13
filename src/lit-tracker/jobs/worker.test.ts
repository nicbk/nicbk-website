// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * That the worker starts at all, and keeps trying.
 *
 * The failure this guards is silent: a worker that gave up after one failed
 * connection looks exactly like a working one, right up until an upload never
 * resolves. Which queue runs which handler is asserted next to each pipeline's
 * own wiring.
 */

const getQueue = vi.hoisted(() => vi.fn())
vi.mock('./queue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./queue')>()),
  getQueue,
}))

const { startJobWorker } = await import('./worker')

describe('startJobWorker', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps trying until the queue is reachable', async () => {
    // The behaviour the whole feature rests on when a deploy brings the app up
    // before Postgres.
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const work = vi.fn(async (_name: string, _handler: unknown) => 'worker-id')
    getQueue
      .mockRejectedValueOnce(
        Object.assign(new Error(''), { code: 'ECONNREFUSED' }),
      )
      .mockResolvedValue({ work })

    const started = startJobWorker()
    // The retry is scheduled, not immediate; nothing is bound yet.
    expect(work).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5_000)
    await started

    expect(getQueue).toHaveBeenCalledTimes(2)
    // Extraction's five, plus #11's PDF cleanup — which is the point of this
    // file existing: the cleanup is not a stage of that pipeline, and nothing
    // else would notice if it stopped being registered.
    expect(work.mock.calls.map(([name]) => name)).toEqual([
      'lit-tracker.extract',
      'lit-tracker.extract-exhausted',
      'lit-tracker.enrich',
      'lit-tracker.enrich-exhausted',
      'lit-tracker.finalize',
      'lit-tracker.pdf-cleanup',
    ])
  })

  it('starts only once, however many times it is called', async () => {
    // The dev server re-evaluates the entry on reload, and duplicate workers
    // would each hold a connection and fetch from the same queues.
    const first = startJobWorker()

    expect(startJobWorker()).toBe(first)
    await first
  })
})
