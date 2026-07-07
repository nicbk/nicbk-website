import { describe, expect, it } from 'vitest'
import { GPG_FINGERPRINT } from './fingerprint.generated'

describe('GPG_FINGERPRINT', () => {
  it('is a 40-character uppercase-hex fingerprint', () => {
    // Shape only: the value itself is derived from public/pgp/nicbk.asc by
    // scripts/gen-gpg-artifacts.mjs and guarded against drift in CI.
    expect(GPG_FINGERPRINT).toMatch(/^[0-9A-F]{40}$/)
  })
})
