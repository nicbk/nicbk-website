import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetSession, resolveSession } from './session-cache'

// The server function is the boundary: calling the real one would try to reach
// a server, and its handler would drag the database client into a unit test.
const { fetchSession } = vi.hoisted(() => ({ fetchSession: vi.fn() }))
vi.mock('./fetch-session', () => ({ fetchSession }))

/** Stands in for whatever Better Auth returns for a signed-in request. */
const SIGNED_IN = { user: { id: 'user-1' }, session: { id: 'session-1' } }

/** A resolution held open, so a second caller can arrive mid-flight. */
function heldResolution() {
  let settle: (session: unknown) => void = () => {}
  const held = new Promise((resolve) => {
    settle = resolve
  })
  fetchSession.mockReturnValue(held)
  return { settle: (session: unknown) => settle(session) }
}

beforeEach(() => {
  fetchSession.mockReset()
  fetchSession.mockResolvedValue(SIGNED_IN)
  // A page load's worth of cache, and each case is its own page load.
  forgetSession()
})

describe('resolveSession, in a browser', () => {
  it('asks the server once and answers the second caller from memory', async () => {
    await expect(resolveSession()).resolves.toBe(SIGNED_IN)
    await expect(resolveSession()).resolves.toBe(SIGNED_IN)

    expect(fetchSession).toHaveBeenCalledTimes(1)
  })

  it('caches a signed-out answer too, rather than re-asking for a null', async () => {
    fetchSession.mockResolvedValue(null)

    await expect(resolveSession()).resolves.toBeNull()
    await expect(resolveSession()).resolves.toBeNull()

    expect(fetchSession).toHaveBeenCalledTimes(1)
  })

  it('lets concurrent callers share one resolution rather than racing', async () => {
    const { settle } = heldResolution()

    // Both arrive before either can have finished: this is a route guard, and
    // a burst of navigations must not become a burst of requests.
    const first = resolveSession()
    const second = resolveSession()
    settle(SIGNED_IN)

    await expect(Promise.all([first, second])).resolves.toEqual([
      SIGNED_IN,
      SIGNED_IN,
    ])
    expect(fetchSession).toHaveBeenCalledTimes(1)
  })

  it('asks again after being told to forget', async () => {
    await resolveSession()
    forgetSession()
    await resolveSession()

    expect(fetchSession).toHaveBeenCalledTimes(2)
  })

  it('does not remember a failure as though it were an answer', async () => {
    fetchSession.mockRejectedValueOnce(new Error('offline'))

    await expect(resolveSession()).rejects.toThrow('offline')
    // The next navigation tries again instead of replaying the failure for the
    // life of the document.
    await expect(resolveSession()).resolves.toBe(SIGNED_IN)
    expect(fetchSession).toHaveBeenCalledTimes(2)
  })

  it('leaves a newer resolution alone when an abandoned one fails', async () => {
    // Forgetting mid-flight is what sign-out does, and the failure that lands
    // afterwards belongs to a cache entry that no longer exists.
    fetchSession.mockRejectedValueOnce(new Error('offline'))
    const abandoned = resolveSession()
    forgetSession()

    const replacement = resolveSession()
    await expect(abandoned).rejects.toThrow('offline')

    await expect(replacement).resolves.toBe(SIGNED_IN)
    await expect(resolveSession()).resolves.toBe(SIGNED_IN)
    expect(fetchSession).toHaveBeenCalledTimes(2)
  })
})
