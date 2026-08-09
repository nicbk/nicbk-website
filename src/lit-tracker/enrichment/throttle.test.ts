// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createThrottle } from './throttle'

/**
 * The rate limiter, with the clock replaced.
 *
 * Every delay here is one this code chose — Semantic Scholar sends no
 * `Retry-After` and no `X-RateLimit-*` headers, which was verified against a
 * real 429 — so the choosing is the behaviour worth testing. The clock is
 * driven by hand rather than by fake timers because the limiter's decisions are
 * about *how long* it asked to wait, and recording those directly says more
 * than watching them elapse.
 */

/** A clock and a `sleep` that advances it instead of waiting. */
function fakeClock() {
  const waits: number[] = []
  let time = 0
  return {
    waits,
    now: () => time,
    sleep: async (ms: number) => {
      waits.push(ms)
      time += ms
    },
  }
}

/** Responses to hand out in order, then repeat the last one forever. */
function responder(...statuses: number[]) {
  const calls: number[] = []
  let index = 0
  return {
    calls,
    request: async () => {
      const status = statuses[Math.min(index, statuses.length - 1)] as number
      index += 1
      calls.push(status)
      return new Response('{}', { status })
    },
  }
}

describe('spacing requests', () => {
  it('lets the first request through immediately', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({ ...clock, random: () => 0 })

    await throttle.run(responder(200).request)

    expect(clock.waits).toEqual([])
  })

  it('waits between consecutive requests', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0,
      minIntervalMs: 1_000,
    })
    const api = responder(200)

    await throttle.run(api.request)
    await throttle.run(api.request)

    // One request per second, the documented rate for an API key and a polite
    // floor for a caller sharing the anonymous pool.
    expect(clock.waits).toEqual([1_000])
  })

  it('runs requests one at a time, however many arrive together', async () => {
    // Concurrency is what actually produces 429s: twelve simultaneous requests
    // against the live API returned eight of them.
    const clock = fakeClock()
    const throttle = createThrottle({ ...clock, random: () => 0 })
    let inFlight = 0
    let peak = 0

    await Promise.all(
      Array.from({ length: 4 }, () =>
        throttle.run(async () => {
          inFlight += 1
          peak = Math.max(peak, inFlight)
          await Promise.resolve()
          inFlight -= 1
          return new Response('{}', { status: 200 })
        }),
      ),
    )

    expect(peak).toBe(1)
  })

  it('does not deadlock behind a request that threw', async () => {
    // A rejected request must not take every later one with it — the queue is
    // process-wide and shared by every upload.
    const clock = fakeClock()
    const throttle = createThrottle({ ...clock, random: () => 0 })

    await expect(
      throttle.run(async () => {
        throw new Error('socket hang up')
      }),
    ).rejects.toThrow(/hang up/)
    const response = await throttle.run(responder(200).request)

    expect(response.status).toBe(200)
  })
})

describe('backing off when the API pushes back', () => {
  it('retries a 429 and returns the eventual success', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({ ...clock, random: () => 0 })
    const api = responder(429, 429, 200)

    const response = await throttle.run(api.request)

    expect(response.status).toBe(200)
    expect(api.calls).toEqual([429, 429, 200])
  })

  it('retries a 5xx as well', async () => {
    // The API sits behind a gateway that sheds load with a 502/503 rather than
    // a 429, and recovers exactly the same way.
    const clock = fakeClock()
    const throttle = createThrottle({ ...clock, random: () => 0 })
    const api = responder(503, 200)

    expect((await throttle.run(api.request)).status).toBe(200)
  })

  it('waits longer after each rejection', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0,
      firstBackoffMs: 2_000,
      maxAttempts: 4,
    })

    await throttle.run(responder(429, 429, 429, 200).request)

    // Doubling, not a fixed delay: the pool clears in waves, and hammering it
    // at a constant rate is how a caller stays inside the wave.
    expect(clock.waits).toEqual([2_000, 4_000, 8_000])
  })

  it('waits once per rejection, not twice', () => {
    // The spacing wait and the backoff are alternatives, not a sequence. Doing
    // both would double every delay — which is how a stage that should take
    // seconds ends up outlasting the retry budget of the job running it.
    const clock = fakeClock()
    const throttle = createThrottle({ ...clock, random: () => 0 })

    return throttle.run(responder(429, 429, 200).request).then(() => {
      expect(clock.waits).toEqual([2_000, 4_000])
    })
  })

  it('spreads its retry across the window rather than arriving on the second', async () => {
    // The pool is shared, so a throttled period ends with every caller in the
    // world retrying at once. Jitter is what keeps this process out of that
    // thundering herd.
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0.5,
      firstBackoffMs: 2_000,
    })

    await throttle.run(responder(429, 200).request)

    expect(clock.waits).toContain(2_500)
  })

  it('gives up after a bounded number of attempts, handing back the 429', async () => {
    // Classifying the outcome is the caller's job. The stage above turns it
    // into a retry of the whole job minutes later, which is a better place to
    // wait than a worker held open against a busy API.
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0,
      maxAttempts: 3,
    })
    const api = responder(429)

    const response = await throttle.run(api.request)

    expect(response.status).toBe(429)
    expect(api.calls).toHaveLength(3)
  })
})

describe('adapting the rate it allows itself', () => {
  it('slows down after being throttled', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0,
      minIntervalMs: 1_000,
    })

    expect(throttle.intervalMs()).toBe(1_000)
    await throttle.run(responder(429, 429, 200).request)

    // The limiter learns the rate it is currently allowed instead of asserting
    // one, because the API throttles by current load rather than by quota.
    expect(throttle.intervalMs()).toBeGreaterThan(1_000)
  })

  it('speeds back up as the API starts answering, but not all at once', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0,
      minIntervalMs: 1_000,
    })
    const api = responder(429, 429, 200)

    await throttle.run(api.request)
    const afterThrottling = throttle.intervalMs()
    await throttle.run(responder(200).request)

    // Halving rather than dropping straight back to the floor: recovering in
    // one step walks into the next 429 immediately.
    expect(throttle.intervalMs()).toBeLessThan(afterThrottling)
    expect(throttle.intervalMs()).toBeGreaterThanOrEqual(1_000)
  })

  it('never slows past its ceiling', async () => {
    const clock = fakeClock()
    const throttle = createThrottle({
      ...clock,
      random: () => 0,
      minIntervalMs: 1_000,
      maxIntervalMs: 4_000,
      maxAttempts: 6,
    })

    await throttle.run(responder(429).request)

    expect(throttle.intervalMs()).toBe(4_000)
  })
})
