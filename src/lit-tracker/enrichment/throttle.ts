/**
 * The rate limiter every Semantic Scholar request goes through.
 *
 * ## Why this is not just a retry loop
 *
 * Semantic Scholar's free tier is a pool shared with every other
 * unauthenticated caller on the internet, and it is throttled by *current load*
 * rather than by a per-caller quota. Measured against the live API while
 * building this: twelve concurrent requests returned eight 429s and four 200s,
 * and a minute later four rapid sequential requests all succeeded. The
 * documentation says "further throttled during periods of heavy use" and means
 * it.
 *
 * Two consequences shape this file:
 *
 * - **There is nothing to read off the response.** No `Retry-After`, no
 *   `X-RateLimit-*` headers — verified against a real 429. Every delay here is
 *   one this code chose.
 * - **The right spacing is not knowable in advance.** So it is not configured:
 *   requests start one second apart (the documented rate for an API key),
 *   double their spacing each time the API pushes back, and halve it back down
 *   as it starts answering again. The limiter learns the rate it is currently
 *   allowed instead of asserting one.
 *
 * Requests are also **serialized process-wide**. Concurrency is what actually
 * produced the 429s above, and a personal-collection upload needs one batch
 * request, so there is nothing to gain by racing.
 */

/** Statuses worth waiting out rather than reporting. */
function isRetryable(status: number): boolean {
  // 429 is the throttle itself; 5xx is the gateway in front of the API, which
  // sheds load the same way and recovers the same way.
  return status === 429 || status >= 500
}

export interface ThrottleOptions {
  /** Spacing between requests when nothing is pushing back. */
  minIntervalMs?: number
  /** How far the adaptive spacing may grow. */
  maxIntervalMs?: number
  /** Attempts for one request, including the first. */
  maxAttempts?: number
  /** Wait after the first rejection; doubles from there. */
  firstBackoffMs?: number
  maxBackoffMs?: number
  /** Injected so tests can drive the clock instead of waiting on it. */
  sleep?: (ms: number) => Promise<void>
  now?: () => number
  random?: () => number
}

/**
 * The division of labour with the queue's own retry policy, which matters
 * because two nested backoff loops multiply if neither knows what it is for.
 *
 * **This limiter handles spacing and bursts**: the wave of 429s that a busy
 * minute produces, over a few seconds. **The queue handles outages**: an API
 * that is still refusing a minute later, retried by pg-boss and eventually
 * given up on (`jobs/queue.ts`). So the numbers here stay small — a request
 * that has failed three times in ten seconds is not going to be rescued by a
 * fourth in the same worker.
 */
const DEFAULTS = {
  // One request per second is the documented rate for an API key, and a
  // sensible floor for a caller sharing the anonymous pool politely.
  minIntervalMs: 1_000,
  // A ceiling on *spacing*, not on waiting: eight seconds apart is already far
  // more cautious than the API asks for, and a higher one lingers — the
  // interval only halves per success, so every extra doubling is another slow
  // request after the throttling has passed.
  maxIntervalMs: 8_000,
  maxAttempts: 3,
  firstBackoffMs: 2_000,
  maxBackoffMs: 10_000,
} as const

export interface Throttle {
  /**
   * Runs one request, waiting its turn first and retrying while the API is
   * pushing back.
   *
   * Resolves with the final response — including a 429 that outlasted every
   * attempt. Classifying that is the caller's job, not the limiter's.
   */
  run: (request: () => Promise<Response>) => Promise<Response>
  /** The current spacing, for logging and for asserting the adaptation. */
  intervalMs: () => number
}

export function createThrottle(options: ThrottleOptions = {}): Throttle {
  const config = { ...DEFAULTS, ...options }
  const sleep = options.sleep ?? defaultSleep
  const now = options.now ?? Date.now
  const random = options.random ?? Math.random

  let intervalMs: number = config.minIntervalMs
  let nextAllowedAt = 0
  // The serialization point: every call appends itself to one chain, so no two
  // requests are ever in flight together however many uploads are being
  // processed.
  let queue: Promise<unknown> = Promise.resolve()

  async function execute(request: () => Promise<Response>): Promise<Response> {
    for (let attempt = 1; ; attempt += 1) {
      const wait = nextAllowedAt - now()
      if (wait > 0) {
        await sleep(wait)
      }

      const response = await request()
      nextAllowedAt = now() + intervalMs

      if (!isRetryable(response.status)) {
        // Recover gradually rather than all at once: dropping straight back to
        // the floor after one success walks into the next 429 immediately.
        intervalMs = Math.max(config.minIntervalMs, Math.floor(intervalMs / 2))
        return response
      }

      // The body of a throttled response is a fixed error message. Reading it
      // is what lets the connection be reused instead of hanging around.
      await response.text().catch(() => '')
      intervalMs = Math.min(config.maxIntervalMs, intervalMs * 2)

      if (attempt >= config.maxAttempts) {
        return response
      }
      // The backoff replaces the spacing wait rather than following it. Both
      // would mean waiting twice for one rejection, which is how a stage that
      // looks like it takes seconds ends up taking minutes.
      const backoff = backoffFor(attempt, config, random)
      await sleep(backoff)
      nextAllowedAt = now()
    }
  }

  return {
    run(request) {
      const result = queue.then(() => execute(request))
      // The chain must not break on a rejection, or one failed request would
      // deadlock every later one behind it.
      queue = result.catch(() => undefined)
      return result
    },
    intervalMs: () => intervalMs,
  }
}

/**
 * Exponential backoff with jitter.
 *
 * The jitter matters more than usual here: the pool is shared, so a throttled
 * period ends with every caller in the world retrying at once. Spreading this
 * process's retry across the window is what keeps it from arriving in the same
 * thundering herd that caused the 429.
 */
function backoffFor(
  attempt: number,
  config: { firstBackoffMs: number; maxBackoffMs: number },
  random: () => number,
): number {
  const base = Math.min(
    config.maxBackoffMs,
    config.firstBackoffMs * 2 ** (attempt - 1),
  )
  return base + Math.floor(random() * (base / 2))
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
