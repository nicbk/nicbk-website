import { describe, expect, it } from 'vitest'
import { signInSearchSchema } from './search-schema'

describe('signInSearchSchema', () => {
  it('leaves both params absent for a bare /sign-in', () => {
    // Absent rather than defaulted: a defaulted field would be serialized back
    // into the URL of every plain link to this page.
    expect(signInSearchSchema.parse({})).toEqual({})
  })

  it('keeps a return-to destination and an error code', () => {
    expect(
      signInSearchSchema.parse({ returnTo: '/lit', error: 'access_denied' }),
    ).toEqual({ returnTo: '/lit', error: 'access_denied' })
  })

  it('degrades a malformed value to absent rather than throwing the page', () => {
    expect(signInSearchSchema.parse({ returnTo: ['/lit'], error: 7 })).toEqual(
      {},
    )
  })

  it('does not validate the destination itself', () => {
    // The schema's job is the shape; `sanitizeReturnTo` is what decides whether
    // a well-formed string is a safe place to send someone.
    expect(
      signInSearchSchema.parse({ returnTo: 'https://evil.example' }).returnTo,
    ).toBe('https://evil.example')
  })
})
