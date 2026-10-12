// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { readOutline } from './read-outline'

/**
 * The real engine, on a real PDF: a synthetic three-page fixture with a nested
 * outline (`fixtures/outlined.pdf`, generated, no paper's content), plus a PDF
 * with none. Node's environment rather than the DOM's, because this runs in the
 * worker, and the engine's WebAssembly is loaded the way the worker loads it.
 */

const fixture = (name: string) =>
  readFile(new URL(`./fixtures/${name}`, import.meta.url)).then(
    (buffer) => new Uint8Array(buffer),
  )

describe('readOutline', () => {
  it('reads a PDF’s outline, nested and placed', async () => {
    const entries = await readOutline(await fixture('outlined.pdf'))
    expect(
      entries.map(({ title, depth, pageIndex }) => ({
        title,
        depth,
        pageIndex,
      })),
    ).toEqual([
      { title: '1 Introduction', depth: 1, pageIndex: 0 },
      { title: '1.1 Background', depth: 2, pageIndex: 1 },
      { title: '2 Method', depth: 1, pageIndex: 2 },
    ])
    // Each heading was bookmarked 12pt above its baseline: 792 − 612 = 180.
    expect(entries[0]?.top).toBeCloseTo(180, 0)
  })

  it('reads an empty outline from a PDF without one', async () => {
    const plain = new TextEncoder().encode(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    )
    expect(await readOutline(plain)).toEqual([])
  })
})
