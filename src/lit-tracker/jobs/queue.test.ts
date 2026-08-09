// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The queue's own wiring, with pg-boss stubbed.
 *
 * Three things here are decisions rather than plumbing, and each has a real
 * failure mode: `start()` must be followed by `createQueue` (pg-boss 12 rejects
 * a send to a queue that does not exist), the extract queue must carry its
 * retry policy and a dead-letter queue (without which an exhausted job leaves
 * its row spinning forever), and the shared instance must cache the **promise**
 * rather than the resolved value — otherwise two concurrent first uploads each
 * run a schema migration.
 */

const start = vi.hoisted(() => vi.fn())
const createQueue = vi.hoisted(() => vi.fn())
const updateQueue = vi.hoisted(() => vi.fn())
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
    updateQueue = updateQueue
  },
}))

const {
  EXTRACT_DEAD_LETTER_QUEUE,
  EXTRACT_QUEUE,
  FINALIZE_QUEUE,
  getQueue,
  startQueue,
} = await import('./queue')

beforeEach(() => {
  constructed.count = 0
  start.mockReset()
  start.mockResolvedValue(undefined)
  createQueue.mockReset()
  createQueue.mockResolvedValue(undefined)
  updateQueue.mockReset()
  updateQueue.mockResolvedValue(undefined)
  on.mockReset()
})

/** The queue names in the order `createQueue` was called with them. */
function createdQueues(): string[] {
  return createQueue.mock.calls.map(([name]) => name as string)
}

describe('startQueue', () => {
  it('creates every queue in the chain after starting', async () => {
    await startQueue('postgres://unit@localhost/unused')

    expect(start).toHaveBeenCalledTimes(1)
    // Sending to a queue that does not exist is an error in pg-boss 12, so this
    // is not optional setup.
    expect(createdQueues()).toEqual(
      expect.arrayContaining([
        EXTRACT_QUEUE,
        FINALIZE_QUEUE,
        EXTRACT_DEAD_LETTER_QUEUE,
      ]),
    )
  })

  it('creates the dead-letter queue before the queue that names it', async () => {
    await startQueue('postgres://unit@localhost/unused')

    const created = createdQueues()
    expect(created.indexOf(EXTRACT_DEAD_LETTER_QUEUE)).toBeLessThan(
      created.indexOf(EXTRACT_QUEUE),
    )
  })

  it('gives the extract queue a retry policy and a dead letter', async () => {
    await startQueue('postgres://unit@localhost/unused')

    const policy = {
      retryLimit: expect.any(Number),
      retryBackoff: true,
      deadLetter: EXTRACT_DEAD_LETTER_QUEUE,
    }
    expect(createQueue).toHaveBeenCalledWith(
      EXTRACT_QUEUE,
      expect.objectContaining(policy),
    )
    // `createQueue` ignores the options of a queue that already exists, so the
    // policy is re-applied — otherwise a database carrying the queue from an
    // earlier version would keep that version's settings, silently.
    expect(updateQueue).toHaveBeenCalledWith(
      EXTRACT_QUEUE,
      expect.objectContaining(policy),
    )
  })

  it('listens for errors, which pg-boss emits instead of throwing', async () => {
    await startQueue('postgres://unit@localhost/unused')

    // Without a listener a failing queue would go silent.
    expect(on).toHaveBeenCalledWith('error', expect.any(Function))
  })
})

describe('getQueue', () => {
  // These run in order against one module cache, and that is the point: a
  // second `describe` would get the first one's instance and prove nothing.
  it('does not cache a failed start', async () => {
    // Runs first, while the cache is still empty. Postgres being briefly
    // unreachable — a restart, a deploy — would otherwise poison this module
    // for the life of the process: every later caller would be handed the same
    // rejected promise and nothing would ever reconnect. The extraction
    // worker's retry loop depends on this.
    start.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    await expect(getQueue()).rejects.toThrow(/ECONNREFUSED/)
    await expect(getQueue()).resolves.toBeDefined()
  })

  it('starts once, whether callers arrive together or later', async () => {
    // The reason the *promise* is cached rather than the resolved value: two
    // concurrent first uploads would otherwise each construct a client and run
    // a schema migration.
    const [first, second] = await Promise.all([getQueue(), getQueue()])
    const later = await getQueue()

    // The successful start from the test above; nothing new was constructed.
    expect(constructed.count).toBe(0)
    expect(start).not.toHaveBeenCalled()
    expect(first).toBe(second)
    expect(later).toBe(first)
  })
})
