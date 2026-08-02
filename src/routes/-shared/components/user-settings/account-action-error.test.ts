import { describe, expect, it } from 'vitest'
import {
  DELETE_FAILED_MESSAGE,
  deleteFailedMessage,
  isStaleSessionError,
  STALE_SESSION_MESSAGE,
} from './account-action-error'

describe('isStaleSessionError', () => {
  it('recognizes the code Better Auth returns for a stale session', () => {
    expect(isStaleSessionError('SESSION_EXPIRED')).toBe(true)
  })

  it.each([
    undefined,
    '',
    'USER_NOT_FOUND',
    'session_expired',
  ])('treats %s as an ordinary failure', (code) => {
    expect(isStaleSessionError(code)).toBe(false)
  })
})

describe('deleteFailedMessage', () => {
  it('asks the reader to sign in again when the session is stale', () => {
    expect(deleteFailedMessage('SESSION_EXPIRED')).toBe(STALE_SESSION_MESSAGE)
  })

  it.each([
    undefined,
    'USER_NOT_FOUND',
    'FAILED_TO_GET_SESSION',
    'something_better_auth_has_not_invented_yet',
  ])('asks the reader to retry for %s', (code) => {
    expect(deleteFailedMessage(code)).toBe(DELETE_FAILED_MESSAGE)
  })
})
