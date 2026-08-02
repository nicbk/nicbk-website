import { describe, expect, it } from 'vitest'
import { avatarInitial } from './initial'

describe('avatarInitial', () => {
  it('prefers the display name', () => {
    expect(avatarInitial({ name: 'Nicolás Kennedy', email: 'z@x.com' })).toBe(
      'N',
    )
  })

  it('uppercases a lowercase name', () => {
    expect(avatarInitial({ name: 'ada', email: 'z@x.com' })).toBe('A')
  })

  it('falls back to the email when the name is blank', () => {
    // Better Auth's `name` comes from the Google profile and is free-form;
    // `email` always exists, which is why it is the fallback.
    expect(avatarInitial({ name: '   ', email: 'nicbk@x.com' })).toBe('N')
  })

  it('keeps a non-BMP first character whole', () => {
    // Indexing a string by [0] would cut a surrogate pair in half and render
    // the replacement box instead of the character.
    expect(avatarInitial({ name: '𝒜da', email: 'z@x.com' })).toBe('𝒜')
  })

  it('falls back to a letter when even the email yields nothing', () => {
    expect(avatarInitial({ name: '', email: '' })).toBe('U')
  })
})
