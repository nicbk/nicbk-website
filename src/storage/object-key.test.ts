import { describe, expect, it } from 'vitest'
import {
  isOwnedBy,
  ownerOfPrefix,
  pdfObjectKey,
  userPdfPrefix,
} from './object-key'

const USER = 'user_2abc'
const ARTICLE = '01930000-0000-7000-8000-000000000001'

describe('pdfObjectKey', () => {
  it('places the owner segment before the article segment', () => {
    // The order is what makes a user's whole collection one prefix, so it is
    // asserted literally rather than by parsing the result back apart.
    expect(pdfObjectKey(USER, ARTICLE)).toBe(
      `lit-tracker/${USER}/${ARTICLE}/source.pdf`,
    )
  })

  it('is stable for the same inputs', () => {
    // Nothing in the key may vary per call — the value is persisted in
    // `upload_jobs.pdf_object_key` and used again, much later, to fetch the PDF.
    expect(pdfObjectKey(USER, ARTICLE)).toBe(pdfObjectKey(USER, ARTICLE))
  })

  it('gives two articles of one user distinct keys', () => {
    const other = '01930000-0000-7000-8000-000000000002'
    expect(pdfObjectKey(USER, ARTICLE)).not.toBe(pdfObjectKey(USER, other))
  })
})

describe('isOwnedBy', () => {
  it('accepts a key under the user own prefix', () => {
    expect(isOwnedBy(pdfObjectKey(USER, ARTICLE), USER)).toBe(true)
  })

  it('rejects another user key', () => {
    expect(isOwnedBy(pdfObjectKey('user_other', ARTICLE), USER)).toBe(false)
  })

  it('rejects a user id that is only a prefix of the owner', () => {
    // Without the trailing separator, `user_2` would match `user_2abc/…` and
    // one account could read another's PDFs by holding a shorter id.
    expect(isOwnedBy(pdfObjectKey(USER, ARTICLE), 'user_2')).toBe(false)
  })

  it('rejects a key that merely contains the user id further along', () => {
    expect(isOwnedBy(`lit-tracker/user_other/${USER}/source.pdf`, USER)).toBe(
      false,
    )
  })

  it('rejects a key outside the lit-tracker prefix entirely', () => {
    expect(isOwnedBy(`other-app/${USER}/${ARTICLE}/source.pdf`, USER)).toBe(
      false,
    )
  })
})

describe('userPdfPrefix', () => {
  it('is the folder every one of the user’s keys starts with', () => {
    expect(
      pdfObjectKey('user-1', 'article-1').startsWith(userPdfPrefix('user-1')),
    ).toBe(true)
  })

  it('ends with a slash, so one id is never the start of another’s folder', () => {
    expect(
      pdfObjectKey('user-10', 'a').startsWith(userPdfPrefix('user-1')),
    ).toBe(false)
  })
})

describe('ownerOfPrefix', () => {
  it('reads the user from their folder', () => {
    expect(ownerOfPrefix(userPdfPrefix('user-1'))).toBe('user-1')
  })

  it.each([
    'lit-tracker/',
    'lit-tracker/user-1',
    'lit-tracker/user-1/article/',
    'other-app/user-1/',
  ])('names no user for %s', (prefix) => {
    expect(ownerOfPrefix(prefix)).toBeNull()
  })
})
