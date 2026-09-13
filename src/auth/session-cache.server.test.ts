// @vitest-environment node
//
// Deliberately not jsdom. The claim under test is that the cache is unreachable
// on the server, and the only honest way to make that claim is to run the
// module in the environment the server bundle runs in — no `window`, nothing
// stubbed to look like one missing.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveSession } from './session-cache'

const { fetchSession } = vi.hoisted(() => ({ fetchSession: vi.fn() }))
vi.mock('./fetch-session', () => ({ fetchSession }))

const SIGNED_IN = { user: { id: 'user-1' }, session: { id: 'session-1' } }

beforeEach(() => {
  fetchSession.mockReset()
  fetchSession.mockResolvedValue(SIGNED_IN)
})

describe('resolveSession, on the server', () => {
  it('resolves afresh every time, because one process serves every reader', async () => {
    await resolveSession()
    await resolveSession()

    // If this ever counts one, the second reader to arrive is being handed the
    // first reader's session. That is why this test exists in place of a
    // comment promising the same thing.
    expect(fetchSession).toHaveBeenCalledTimes(2)
  })
})
