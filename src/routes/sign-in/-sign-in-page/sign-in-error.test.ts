import { describe, expect, it } from 'vitest'
import { GENERIC_SIGN_IN_ERROR, signInErrorMessage } from './sign-in-error'

describe('signInErrorMessage', () => {
  it('shows nothing when no error code is present', () => {
    expect(signInErrorMessage(undefined)).toBeNull()
  })

  it('shows nothing for an empty error code', () => {
    // `?error=` in the URL is not an error anyone chose to report.
    expect(signInErrorMessage('')).toBeNull()
  })

  it('says the sign-in was cancelled when the user declined at Google', () => {
    expect(signInErrorMessage('access_denied')).toBe('Sign-in was cancelled.')
  })

  it.each([
    'state_mismatch',
    'invalid_code',
    'unable_to_get_user_info',
    'user_creation_failed',
    'something_better_auth_has_not_invented_yet',
  ])('falls back to the generic message for %s', (code) => {
    expect(signInErrorMessage(code)).toBe(GENERIC_SIGN_IN_ERROR)
  })
})
