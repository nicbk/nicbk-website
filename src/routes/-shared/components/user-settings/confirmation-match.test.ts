import { describe, expect, it } from 'vitest'
import { matchesConfirmation } from './confirmation-match'

const EMAIL = 'reader@example.com'

describe('matchesConfirmation', () => {
  it('matches the phrase typed exactly', () => {
    expect(matchesConfirmation(EMAIL, EMAIL)).toBe(true)
  })

  it('does not match a partially typed phrase', () => {
    expect(matchesConfirmation('reader@example.co', EMAIL)).toBe(false)
  })

  it('does not match while the field is still empty', () => {
    expect(matchesConfirmation('', EMAIL)).toBe(false)
  })

  it.each([
    ['leading whitespace', ' reader@example.com'],
    ['trailing whitespace', 'reader@example.com '],
    ['internal whitespace', 'reader @example.com'],
    ['different case', 'Reader@Example.com'],
    ['a different address', 'reader@example.org'],
    ['extra characters', 'reader@example.comm'],
  ])('does not match on %s', (_description, typed) => {
    expect(matchesConfirmation(typed, EMAIL)).toBe(false)
  })

  it('never matches an empty phrase, not even an empty field', () => {
    // A phrase nobody has to type would be no confirmation at all.
    expect(matchesConfirmation('', '')).toBe(false)
  })
})
