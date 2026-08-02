import { describe, expect, it } from 'vitest'
import { hasValidApiKey } from './api-key'

const EXPECTED = 'zero-cache-api-key-value-long-enough'

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://nicbk.com/api/zero/query', {
    method: 'POST',
    headers,
  })
}

describe('hasValidApiKey', () => {
  it('accepts the configured key', () => {
    expect(
      hasValidApiKey(requestWith({ 'X-Api-Key': EXPECTED }), EXPECTED),
    ).toBe(true)
  })

  it('accepts the header under any casing', () => {
    // HTTP header names are case-insensitive, and nothing guarantees which
    // casing zero-cache sends.
    expect(
      hasValidApiKey(requestWith({ 'x-api-key': EXPECTED }), EXPECTED),
    ).toBe(true)
  })

  it('refuses a request with no key at all', () => {
    expect(hasValidApiKey(requestWith({}), EXPECTED)).toBe(false)
  })

  it('refuses a wrong key of the same length', () => {
    const wrong = `${'x'.repeat(EXPECTED.length - 1)}y`
    expect(hasValidApiKey(requestWith({ 'X-Api-Key': wrong }), EXPECTED)).toBe(
      false,
    )
  })

  it('refuses a key that is a prefix of the real one', () => {
    // The length mismatch is handled before the timing-safe comparison, which
    // throws on unequal lengths — so this case must be answered, not crash.
    expect(
      hasValidApiKey(
        requestWith({ 'X-Api-Key': EXPECTED.slice(0, -1) }),
        EXPECTED,
      ),
    ).toBe(false)
  })

  it('refuses an empty key', () => {
    expect(hasValidApiKey(requestWith({ 'X-Api-Key': '' }), EXPECTED)).toBe(
      false,
    )
  })
})
