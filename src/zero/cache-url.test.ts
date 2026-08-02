import { describe, expect, it } from 'vitest'
import { requireZeroCacheUrl } from './cache-url'

describe('requireZeroCacheUrl', () => {
  it('returns a configured address unchanged', () => {
    // Both shapes the deployment actually uses: the published port locally,
    // and same-origin with one path segment in production.
    expect(requireZeroCacheUrl('http://localhost:4848')).toBe(
      'http://localhost:4848',
    )
    expect(requireZeroCacheUrl('https://nicbk.com/zero')).toBe(
      'https://nicbk.com/zero',
    )
  })

  it('trims surrounding whitespace', () => {
    // A trailing space is easy to leave in a hand-edited .env on the host, and
    // Zero's own URL parsing would reject it with a message about the scheme
    // rather than about the whitespace.
    expect(requireZeroCacheUrl('  http://localhost:4848\n')).toBe(
      'http://localhost:4848',
    )
  })

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['only whitespace', '   '],
  ])('throws naming the variable when it is %s', (_case, configured) => {
    // Zero's own behaviour here is a console warning and then a client that
    // syncs nothing — which on screen is indistinguishable from an account
    // with no articles. Failing loudly is the whole point of this function.
    expect(() => requireZeroCacheUrl(configured)).toThrow(/VITE_ZERO_CACHE_URL/)
  })
})
