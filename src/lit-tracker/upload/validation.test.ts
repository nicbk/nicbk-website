import { describe, expect, it } from 'vitest'
import type { CandidateFile } from './validation'
import {
  describeRejection,
  MAX_FILE_BYTES,
  MAX_FILES_PER_SUBMISSION,
  rejectionForCount,
  rejectionForFile,
} from './validation'

/** A file whose bytes really are a PDF, unless a test says otherwise. */
function candidate(overrides: Partial<CandidateFile> = {}): CandidateFile {
  return {
    name: 'paper.pdf',
    contentType: 'application/pdf',
    bytes: new TextEncoder().encode('%PDF-1.7\n…'),
    ...overrides,
  }
}

describe('rejectionForCount', () => {
  it('accepts a submission at the limit', () => {
    expect(rejectionForCount(MAX_FILES_PER_SUBMISSION)).toBeNull()
  })

  it('rejects one file over the limit, naming the limit', () => {
    expect(rejectionForCount(MAX_FILES_PER_SUBMISSION + 1)).toEqual({
      reason: 'too-many-files',
      limit: MAX_FILES_PER_SUBMISSION,
    })
  })

  it('accepts a single file', () => {
    expect(rejectionForCount(1)).toBeNull()
  })
})

describe('rejectionForFile', () => {
  it('accepts a real PDF declared as one', () => {
    expect(rejectionForFile(candidate())).toBeNull()
  })

  it('rejects a file whose declared type is not PDF', () => {
    expect(rejectionForFile(candidate({ contentType: 'image/png' }))).toEqual({
      reason: 'wrong-content-type',
      declared: 'image/png',
    })
  })

  it('rejects a file that claims to be a PDF but is not', () => {
    // The case the magic-byte check exists for: the declared content type is
    // chosen by the client, so it proves nothing on its own.
    expect(
      rejectionForFile(
        candidate({ bytes: new TextEncoder().encode('MZ\x90\x00not a pdf') }),
      ),
    ).toEqual({ reason: 'not-a-pdf' })
  })

  it('rejects a file too short to carry the signature', () => {
    expect(
      rejectionForFile(candidate({ bytes: new Uint8Array([0x25, 0x50]) })),
    ).toEqual({ reason: 'not-a-pdf' })
  })

  it('rejects an empty file', () => {
    expect(rejectionForFile(candidate({ bytes: new Uint8Array() }))).toEqual({
      reason: 'not-a-pdf',
    })
  })

  it('rejects a file over the size limit, naming both sizes', () => {
    const oversized = new Uint8Array(MAX_FILE_BYTES + 1)
    oversized.set(new TextEncoder().encode('%PDF-'))

    expect(rejectionForFile(candidate({ bytes: oversized }))).toEqual({
      reason: 'too-large',
      bytes: MAX_FILE_BYTES + 1,
      limit: MAX_FILE_BYTES,
    })
  })

  it('accepts a file exactly at the size limit', () => {
    const exact = new Uint8Array(MAX_FILE_BYTES)
    exact.set(new TextEncoder().encode('%PDF-'))

    expect(rejectionForFile(candidate({ bytes: exact }))).toBeNull()
  })

  it('reports the wrong declared type before reading the bytes', () => {
    // Order matters for the message the user sees: a PNG that is genuinely a
    // PNG should be told it is a PNG, not that its contents are not a PDF.
    expect(
      rejectionForFile(
        candidate({
          contentType: 'image/png',
          bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        }),
      ),
    ).toEqual({ reason: 'wrong-content-type', declared: 'image/png' })
  })
})

describe('describeRejection', () => {
  it('distinguishes a wrong declared type from failed magic bytes', () => {
    // Both are "not a PDF" to the system but mean different things to the
    // person holding the file, so the two messages must not collapse.
    const declared = describeRejection({
      reason: 'wrong-content-type',
      declared: 'image/png',
    })
    const contents = describeRejection({ reason: 'not-a-pdf' })

    expect(declared).not.toBe(contents)
    expect(declared).toContain('image/png')
    expect(contents).toContain('says it is one')
  })

  it('names the actual and permitted sizes in megabytes', () => {
    expect(
      describeRejection({
        reason: 'too-large',
        bytes: 60 * 1024 * 1024,
        limit: MAX_FILE_BYTES,
      }),
    ).toBe('Too large: 60.0 MB exceeds the 50.0 MB limit.')
  })

  it('names the file limit', () => {
    expect(
      describeRejection({ reason: 'too-many-files', limit: 20 }),
    ).toContain('at most 20')
  })
})
