// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The queue's own wiring, with pg-boss stubbed.
 *
 * Two things here are decisions rather than plumbing, and both have a real
 * failure mode: `start()` must be followed by `createQueue` (pg-boss 12 rejects
 * a send to a queue that does not exist), and the shared instance must cache
 * the **promise** rather than the resolved value — otherwise two concurrent
 * first uploads each run a schema migration.
 */

const start = vi.hoisted(() => vi.fn())
const createQueue = vi.hoisted(() => vi.fn())
const on = vi.hoisted(() => vi.fn())
const constructed = vi.hoisted(() => ({ count: 0 }))

vi.mock('pg-boss', () => ({
  PgBoss: class {
    constructor() {
      constructed.count += 1
    }
    on = on
    start = start
    createQueue = createQueue
  },
}))

const { EXTRACT_QUEUE, getQueue, startQueue } = await import('./queue')

beforeEach(() => {
  constructed.count = 0
  start.mockReset()
  start.mockResolvedValue(undefined)
  createQueue.mockReset()
  createQueue.mockResolvedValue(undefined)
  on.mockReset()
})

describe('startQueue', () => {
  it('creates the extract queue after starting', async () => {
    await startQueue('postgres://unit@localhost/unused')

    expect(start).toHaveBeenCalledTimes(1)
    // Sending to a queue that does not exist is an error in pg-boss 12, so this
    // is not optional setup.
    expect(createQueue).toHaveBeenCalledWith(EXTRACT_QUEUE)
  })

  it('listens for errors, which pg-boss emits instead of throwing', async () => {
    await startQueue('postgres://unit@localhost/unused')

    // Without a listener a failing queue would go silent.
    expect(on).toHaveBeenCalledWith('error', expect.any(Function))
  })
})

describe('getQueue', () => {
  // One test rather than two: the cache is module state, so a second test would
  // observe the first one's instance and prove nothing about construction.
  it('starts once, whether callers arrive together or later', async () => {
    // The reason the *promise* is cached rather than the resolved value: two
    // concurrent first uploads would otherwise each construct a client and run
    // a schema migration.
    const [first, second] = await Promise.all([getQueue(), getQueue()])
    const later = await getQueue()

    expect(constructed.count).toBe(1)
    expect(start).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
    expect(later).toBe(first)
  })
})
