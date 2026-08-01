import { describe, expect, it } from 'vitest'
import { DEFAULT_RETURN_TO, sanitizeReturnTo } from './return-to'

describe('sanitizeReturnTo', () => {
  it('round-trips a same-origin app path', () => {
    expect(sanitizeReturnTo('/lit/collection')).toBe('/lit/collection')
  })

  it('preserves the query string and fragment of an app path', () => {
    expect(sanitizeReturnTo('/blog?q=rust&tags=%5B%22web%22%5D#top')).toBe(
      '/blog?q=rust&tags=%5B%22web%22%5D#top',
    )
  })

  // The open-redirect cases. Each of these would otherwise send a user who
  // started on this site's sign-in page to somebody else's origin.
  it.each([
    ['an absolute http URL', 'http://evil.example/phish'],
    ['an absolute https URL', 'https://evil.example/phish'],
    ['a protocol-relative URL', '//evil.example/phish'],
    ['a backslash protocol-relative URL', '/\\evil.example/phish'],
    ['a backslash pair', '/\\\\evil.example/phish'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a scheme-relative path with credentials', '//user:pass@evil.example/'],
  ])('rejects %s', (_label, value) => {
    expect(sanitizeReturnTo(value)).toBe(DEFAULT_RETURN_TO)
  })

  it.each([
    ['a bare relative path', 'lit/collection'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an array', ['/lit']],
  ])('falls back to the default for %s', (_label, value) => {
    expect(sanitizeReturnTo(value)).toBe(DEFAULT_RETURN_TO)
  })

  it('keeps the default itself valid', () => {
    expect(sanitizeReturnTo(DEFAULT_RETURN_TO)).toBe(DEFAULT_RETURN_TO)
  })
})
