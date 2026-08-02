import { timingSafeEqual } from 'node:crypto'

/**
 * Whether a request carries the expected zero-cache API key.
 *
 * zero-cache sends the key it was configured with in an `X-Api-Key` header on
 * every call to `/query` and `/mutate`. Those routes sit on the public app
 * server, so without this check anyone could POST to them; with it, only the
 * sync engine can. It is not an authorization decision about data — the session
 * makes that one, separately and unconditionally.
 *
 * The comparison is timing-safe. A plain `===` on a secret leaks how many
 * leading characters a guess got right, which is enough to recover the key one
 * character at a time.
 */
export function hasValidApiKey(request: Request, expected: string): boolean {
  const presented = request.headers.get('x-api-key')
  if (presented === null) {
    return false
  }

  const presentedBytes = Buffer.from(presented, 'utf8')
  const expectedBytes = Buffer.from(expected, 'utf8')
  // timingSafeEqual throws on a length mismatch, which would itself be a
  // timing signal — so length is compared first and answered identically.
  if (presentedBytes.length !== expectedBytes.length) {
    return false
  }
  return timingSafeEqual(presentedBytes, expectedBytes)
}
