import { describe, expect, it } from 'vitest'
import { wkdLocalPartHash, zbase32 } from './gen-gpg-artifacts.mjs'

// The generator's pure helpers, tested directly (the gpg-driven generation is
// covered by the determinism/drift checks and the e2e serving spec).
describe('zbase32', () => {
  it('encodes bytes using the WKD z-base-32 alphabet', () => {
    // Single 0x00 byte → 8 bits → two z-base-32 symbols; index 0 is "y".
    expect(zbase32(Uint8Array.from([0x00]))).toBe('yy')
  })

  it('is deterministic for the same input', () => {
    const bytes = Uint8Array.from([1, 2, 3, 4, 5])
    expect(zbase32(bytes)).toBe(zbase32(bytes))
  })
})

describe('wkdLocalPartHash', () => {
  it('matches the known WKD hash for "nicolas" (gpg-wks-client)', () => {
    // Cross-checked against `gpg-wks-client --print-wkd-hash nicolas@nicbk.com`.
    expect(wkdLocalPartHash('nicolas')).toBe('egg3eb1dsgmi4atdj5obrtipjpcjyocr')
  })

  it('lowercases the local part before hashing', () => {
    expect(wkdLocalPartHash('NICOLAS')).toBe(wkdLocalPartHash('nicolas'))
  })
})
