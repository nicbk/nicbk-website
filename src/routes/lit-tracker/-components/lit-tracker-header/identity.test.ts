import { describe, expect, it } from 'vitest'
import { avatarInitial, rootBreadcrumbSegment } from './identity'

describe('rootBreadcrumbSegment', () => {
  it('builds the segment from the email local part', () => {
    expect(
      rootBreadcrumbSegment({ name: 'Nicolás Kennedy', email: 'nicbk@x.com' }),
    ).toBe('nicbk_home')
  })

  it('ignores the display name entirely', () => {
    // The breadcrumb is a path segment, not a label — a name with spaces and
    // accents in it would not read as one.
    expect(
      rootBreadcrumbSegment({ name: 'Ada Lovelace', email: 'nicbk@x.com' }),
    ).toBe('nicbk_home')
  })

  it('reduces punctuation to single underscores', () => {
    expect(
      rootBreadcrumbSegment({ name: '', email: 'first.last+tag@example.com' }),
    ).toBe('first_last_tag_home')
  })

  it('lowercases', () => {
    expect(rootBreadcrumbSegment({ name: '', email: 'NicBK@x.com' })).toBe(
      'nicbk_home',
    )
  })

  it('never leaves a dangling or doubled underscore', () => {
    expect(
      rootBreadcrumbSegment({ name: '', email: '..a--b..@example.com' }),
    ).toBe('a_b_home')
  })

  it('falls back to a generic handle when nothing usable survives', () => {
    // An address whose local part is entirely punctuation would otherwise
    // render as a bare "_home".
    expect(rootBreadcrumbSegment({ name: '', email: '...@example.com' })).toBe(
      'user_home',
    )
  })
})

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
