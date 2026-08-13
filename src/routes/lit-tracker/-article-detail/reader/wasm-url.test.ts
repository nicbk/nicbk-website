import { describe, expect, it } from 'vitest'
import { absoluteAssetUrl } from './wasm-url'

/**
 * The rule that stops the reader hanging forever.
 *
 * EmbedPDF builds its worker from a `blob:` URL, and a `blob:` base cannot
 * resolve a root-relative path — it throws rather than guessing. Vite's `?url`
 * import produces exactly such a path, so the wasm fetch failed inside the
 * worker where nothing surfaced it, and the reader sat on "loading the paper…"
 * with a successful PDF request in the network log. These tests pin both halves:
 * that the conversion happens, and that the thing it prevents is real.
 */

const ORIGIN = 'https://nicbk.com'

describe('absoluteAssetUrl', () => {
  it('makes Vite’s dev asset path absolute', () => {
    expect(
      absoluteAssetUrl(
        '/node_modules/@embedpdf/pdfium/dist/pdfium.wasm',
        ORIGIN,
      ),
    ).toBe('https://nicbk.com/node_modules/@embedpdf/pdfium/dist/pdfium.wasm')
  })

  it('makes Vite’s built, hashed asset path absolute', () => {
    // The production shape. Both must work: a wasm that resolves in dev and
    // 404s from a built bundle is the classic failure for this class of library.
    expect(absoluteAssetUrl('/assets/pdfium-a1b2c3d4.wasm', ORIGIN)).toBe(
      'https://nicbk.com/assets/pdfium-a1b2c3d4.wasm',
    )
  })

  it('leaves an already-absolute URL alone', () => {
    expect(absoluteAssetUrl('https://cdn.example/pdfium.wasm', ORIGIN)).toBe(
      'https://cdn.example/pdfium.wasm',
    )
  })

  it('carries a port through, which is where this runs in development', () => {
    expect(
      absoluteAssetUrl('/assets/pdfium.wasm', 'http://localhost:3000'),
    ).toBe('http://localhost:3000/assets/pdfium.wasm')
  })

  it('is not merely tidiness: a blob: base cannot resolve the un-absolute form', () => {
    // The reason the function exists, asserted against the platform rather than
    // described in a comment. If this ever stops throwing, the workaround can
    // go — and this test is what would say so.
    expect(
      () =>
        new URL('/assets/pdfium.wasm', 'blob:http://localhost:3000/abc-123'),
    ).toThrow()

    // ...whereas what the function produces needs no resolving at all.
    expect(
      new URL(absoluteAssetUrl('/assets/pdfium.wasm', 'http://localhost:3000'))
        .pathname,
    ).toBe('/assets/pdfium.wasm')
  })
})
