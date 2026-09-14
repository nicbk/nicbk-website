import type { PdfDestinationObject } from '@embedpdf/models'
import { PdfZoomMode } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import type { LinkLanding, PageText, TextRun } from './link-preview-region'
import { citationNumber, previewRegion, targetTop } from './link-preview-region'

/**
 * Synthetic pages, shaped after the papers measured for #22 — positions, label
 * styles, column widths — and never their text. No paper's content belongs in
 * this repository.
 */

const WIDTH = 612
const HEIGHT = 792

function run(x: number, y: number, width: number, text: string): TextRun {
  return { text, rect: { origin: { x, y }, size: { width, height: 10 } } }
}

function page(runs: TextRun[]): PageText {
  return { width: WIDTH, height: HEIGHT, runs }
}

/** A destination at a top-left point, written the way a PDF stores it. */
function xyz(pageIndex: number, x: number, top: number): PdfDestinationObject {
  return {
    pageIndex,
    zoom: { mode: PdfZoomMode.XYZ, params: { x, y: HEIGHT - top, zoom: 0 } },
    view: [],
  }
}

function fitRectangle(pageIndex: number, top: number): PdfDestinationObject {
  return {
    pageIndex,
    zoom: { mode: PdfZoomMode.FitRectangle },
    view: [0, HEIGHT - top, WIDTH, HEIGHT - top],
  }
}

function fitPage(pageIndex: number): PdfDestinationObject {
  return { pageIndex, zoom: { mode: PdfZoomMode.FitPage }, view: [] }
}

function pages(byIndex: Record<number, PageText>) {
  return (index: number) => byIndex[index]
}

/**
 * A numbered reference list in one column, LaTeX style: `[k]` hanging at 108,
 * text from 126 to 504, two lines an entry, 30pt apart.
 */
function numberedList(first: number, last: number, startY = 100) {
  const runs: TextRun[] = []
  const tops: Record<number, number> = {}
  for (let k = first; k <= last; k++) {
    const y = startY + (k - first) * 30
    tops[k] = y
    runs.push(run(108, y, 16, `[${k}]`), run(126, y, 378, 'author list, title'))
    runs.push(run(126, y + 12, 300, 'venue and year'))
  }
  return { page: page(runs), tops }
}

function landingsAt(
  pageIndex: number,
  x: number,
  tops: Record<number, number>,
): LinkLanding[] {
  return Object.values(tops).map((y) => ({ pageIndex, x, y }))
}

describe('targetTop', () => {
  it('turns an XYZ destination into a top-left point', () => {
    expect(targetTop(xyz(0, 108, 339), { height: HEIGHT })).toEqual({
      x: 108,
      y: 339,
    })
  })

  it('reads a FitRectangle’s box from its view', () => {
    expect(targetTop(fitRectangle(0, 214), { height: HEIGHT })).toEqual({
      x: 0,
      y: 214,
    })
  })

  it('starts at the top of the page when the file gives no position', () => {
    expect(targetTop(fitPage(0), { height: HEIGHT })).toEqual({ x: 0, y: 0 })
  })
})

describe('citationNumber', () => {
  it.each([
    ['18', 18],
    ['[18]', 18],
    [' 18, ', 18],
    ['7.', 7],
  ])('reads %j as citation %i', (text, number) => {
    expect(citationNumber(text)).toBe(number)
  })

  it.each([
    'Table 1',
    'Peters et al.',
    '5.3',
    '1234',
    '',
  ])('reads %j as no citation number', (text) => {
    expect(citationNumber(text)).toBeNull()
  })
})

describe('previewRegion', () => {
  it('previews an exact target down to the next entry, within its column', () => {
    const { page: references, tops } = numberedList(10, 14)

    const region = previewRegion({
      linkText: 'Hochreiter',
      destination: xyz(10, 108, tops[13] ?? 0),
      pageText: pages({ 10: references }),
      landings: landingsAt(10, 108, tops),
    })

    expect(region).toEqual({
      pageIndex: 10,
      rect: {
        origin: { x: 105, y: (tops[13] ?? 0) - 3 },
        size: { width: 402, height: 33 },
      },
    })
  })

  it('bounds a two-column entry to its own column', () => {
    // Author–year, two columns with a 12pt gutter, as on the BERT page.
    const lines: TextRun[] = []
    for (let i = 0; i < 6; i++) {
      const y = 300 + i * 22
      lines.push(
        run(67, y, 223, 'left column entry'),
        run(302, y, 223, 'right column entry'),
      )
    }
    const tops = [300, 344, 388]

    const region = previewRegion({
      linkText: 'Dai and Le',
      destination: xyz(9, 302, 344),
      pageText: pages({ 9: page(lines) }),
      landings: tops.flatMap((y) => [
        { pageIndex: 9, x: 67, y },
        { pageIndex: 9, x: 302, y },
      ]),
    })

    expect(region?.rect.origin.x).toBe(299)
    expect((region?.rect.origin.x ?? 0) + (region?.rect.size.width ?? 0)).toBe(
      528,
    )
    expect(region?.rect.size.height).toBe(388 - 344 + 3)
  })

  it('ignores the other column’s lines that fall between this column’s', () => {
    // BERT: the right column's baselines sit between the left's, so a line
    // starting there must not be read as this column's.
    const runs: TextRun[] = []
    for (let i = 0; i < 4; i++) {
      runs.push(run(72, 250 + i * 11, 218, 'left column'))
      runs.push(run(307, 256 + i * 11, 218, 'right column'))
    }

    const region = previewRegion({
      linkText: 'Williams et al.',
      destination: xyz(12, 67, 250),
      pageText: pages({ 12: page(runs) }),
      landings: [{ pageIndex: 12, x: 67, y: 300 }],
    })

    expect((region?.rect.origin.x ?? 0) + (region?.rect.size.width ?? 0)).toBe(
      293,
    )
  })

  it('stops a left-column entry at the gutter, not at the far column', () => {
    // The other half of the case above: here the right column's runs start to
    // the right of the target and are on the same lines, so only the gutter
    // separates them.
    const lines: TextRun[] = []
    for (let i = 0; i < 6; i++) {
      const y = 300 + i * 22
      lines.push(
        run(67, y, 223, 'left column entry'),
        run(302, y, 223, 'right column entry'),
      )
    }

    const region = previewRegion({
      linkText: 'Peters et al.',
      destination: xyz(9, 67, 344),
      pageText: pages({ 9: page(lines) }),
      landings: [{ pageIndex: 9, x: 67, y: 388 }],
    })

    expect((region?.rect.origin.x ?? 0) + (region?.rect.size.width ?? 0)).toBe(
      293,
    )
  })

  it('includes a line that starts left of a target partway along it', () => {
    // Attention's "Table 3" link lands inside its caption's first line, which is
    // one run from the column's left edge to its right.
    const captionPage = page([
      run(108, 300, 396, 'Table 3: Variations on the architecture.'),
      run(108, 312, 250, 'All metrics are on the development set.'),
    ])

    const region = previewRegion({
      linkText: '3',
      destination: xyz(8, 150, 300),
      pageText: pages({ 8: captionPage }),
      landings: [],
    })

    expect(region?.rect.origin.x).toBe(105)
    expect((region?.rect.origin.x ?? 0) + (region?.rect.size.width ?? 0)).toBe(
      507,
    )
  })

  it('keeps a table below its caption in the preview, across the gap', () => {
    const tablePage = page([
      run(108, 300, 396, 'Table 3: Variations on the architecture.'),
      run(108, 312, 250, 'All metrics are on the development set.'),
      run(120, 345, 380, 'N d h dk dv PPL BLEU'),
      run(120, 360, 380, '6 512 8 64 64 4.92 25.8'),
    ])

    const region = previewRegion({
      linkText: '3',
      destination: xyz(8, 150, 300),
      pageText: pages({ 8: tablePage }),
      landings: [],
    })

    expect(region?.rect.size.height).toBe(240 + 3)
  })

  it('keeps a short line’s preview wide enough to read', () => {
    const region = previewRegion({
      linkText: '5.3',
      destination: xyz(8, 72, 263),
      pageText: pages({ 8: page([run(72, 263, 30, '5.3')]) }),
      landings: [],
    })

    expect(region?.rect.size.width).toBe(100 + 6)
  })

  it('snaps a numbered citation to its own entry when the file points five entries early', () => {
    // A publisher page: `k.` labels at 36, text to 576, entries 32pt apart, and
    // a FitRectangle that lands on entry 13 for a link reading `18`.
    const runs: TextRun[] = []
    const tops: Record<number, number> = {}
    for (let k = 10; k <= 20; k++) {
      const y = 60 + (k - 10) * 32
      tops[k] = y
      runs.push(run(36, y, 540, `${k}. Author A, Author B. A title.`))
    }

    const region = previewRegion({
      linkText: '18',
      destination: fitRectangle(15, tops[13] ?? 0),
      pageText: pages({ 15: page(runs) }),
      landings: [{ pageIndex: 15, x: 0, y: tops[13] ?? 0 }],
    })

    expect(region?.pageIndex).toBe(15)
    expect(region?.rect.origin.y).toBe((tops[18] ?? 0) - 3)
    expect(region?.rect.size.height).toBe(32 + 3)
  })

  it('snaps to the page after the target when the entry starts there', () => {
    const { page: before } = numberedList(20, 25)
    const { page: after, tops } = numberedList(26, 30)

    const region = previewRegion({
      linkText: '[27]',
      destination: xyz(11, 108, 250),
      pageText: pages({ 11: before, 12: after }),
      landings: [],
    })

    expect(region?.pageIndex).toBe(12)
    expect(region?.rect.origin.y).toBe((tops[27] ?? 0) - 3)
  })

  it('prefers the target page when the label is on two pages', () => {
    const { page: target, tops } = numberedList(5, 9)
    const { page: next } = numberedList(5, 9, 400)

    const region = previewRegion({
      linkText: '7',
      destination: xyz(3, 108, tops[5] ?? 0),
      pageText: pages({ 3: target, 4: next }),
      landings: [],
    })

    expect(region?.pageIndex).toBe(3)
    expect(region?.rect.origin.y).toBe((tops[7] ?? 0) - 3)
  })

  it('does not snap to a label that only appears inside a line of body text', () => {
    const { page: references, tops } = numberedList(10, 14)
    const withBodyMention = page([
      ...references.runs.filter((r) => r.text !== '[12]'),
      run(126, 600, 300, 'as shown in [12] and elsewhere'),
    ])

    const region = previewRegion({
      linkText: '12',
      destination: xyz(10, 108, tops[11] ?? 0),
      pageText: pages({ 10: withBodyMention }),
      landings: [],
    })

    expect(region?.rect.origin.y).toBe((tops[11] ?? 0) - 3)
  })

  it('leaves a numbered link at its exact target when no entry carries its label', () => {
    const { page: references, tops } = numberedList(10, 14)

    const region = previewRegion({
      linkText: '99',
      destination: xyz(10, 108, tops[12] ?? 0),
      pageText: pages({ 10: references }),
      landings: [],
    })

    expect(region?.rect.origin.y).toBe((tops[12] ?? 0) - 3)
  })

  it('does not snap "Table 1" to a numbered line elsewhere on the table’s page', () => {
    // A link covering only the digit is indistinguishable from reference 1; the
    // target — a caption, not a label — is what says it is not a list.
    const tablePage = page([
      run(72, 120, 400, 'Table 1: a caption for the table'),
      run(72, 140, 460, 'cell cell cell cell'),
      run(72, 500, 300, '1. a numbered step in the text'),
    ])

    const region = previewRegion({
      linkText: '1',
      destination: xyz(5, 72, 120),
      pageText: pages({ 5: tablePage }),
      landings: [],
    })

    expect(region?.rect.origin.y).toBe(117)
  })

  it('snaps on a numbered list page even when the file gives no position', () => {
    const { page: references, tops } = numberedList(1, 8)

    const region = previewRegion({
      linkText: '[4]',
      destination: fitPage(14),
      pageText: pages({ 14: references }),
      landings: [],
    })

    expect(region?.rect.origin.y).toBe((tops[4] ?? 0) - 3)
  })

  it('snaps an approximate target that lands above the list it belongs to', () => {
    // PLOS: the rectangle lands in the contributions block over the references,
    // where no line starts with a label.
    const { page: references, tops } = numberedList(1, 6, 300)
    const withPreamble = page([
      run(36, 120, 400, 'Methodology: initials of authors.'),
      ...references.runs,
    ])

    const region = previewRegion({
      linkText: '3',
      destination: fitRectangle(14, 120),
      pageText: pages({ 14: withPreamble }),
      landings: [],
    })

    expect(region?.rect.origin.y).toBe((tops[3] ?? 0) - 3)
  })

  it('keeps an exact target on its table even on a page where the references start', () => {
    // Attention: "Table 4" is a link covering `4`, on the page the numbered
    // references begin.
    const { page: references } = numberedList(1, 6, 400)
    const tableThenReferences = page([
      run(108, 120, 400, 'Table 4: a caption'),
      run(108, 140, 400, 'cell cell cell'),
      ...references.runs,
    ])

    const region = previewRegion({
      linkText: '4',
      destination: xyz(9, 108, 120),
      pageText: pages({ 9: tableThenReferences }),
      landings: [],
    })

    expect(region?.rect.origin.y).toBe(117)
  })

  it('ends a last entry where the next hanging-indent entry starts', () => {
    // Author–year, as on the BERT page: first lines at 72, continuations at 83,
    // no gap between entries, and no landing below the last one.
    const runs: TextRun[] = []
    for (let entry = 0; entry < 3; entry++) {
      const y = 600 + entry * 44
      runs.push(run(72, y, 218, 'Author, Author.'))
      for (let line = 1; line < 4; line++) {
        runs.push(run(83, y + line * 11, 207, 'continuation'))
      }
    }

    const region = previewRegion({
      linkText: 'Author et al.',
      destination: xyz(10, 67, 600),
      pageText: pages({ 10: page(runs) }),
      landings: [],
    })

    expect(region?.rect.size.height).toBe(3 * 11 + 10 + 3)
  })

  it('ends a heading’s block at the paragraph gap below it', () => {
    const headingPage = page([
      run(108, 200, 120, '3.2 Attention'),
      run(108, 212, 400, 'the paragraph under it'),
      run(108, 224, 400, 'the paragraph under it'),
      run(108, 260, 400, 'the next paragraph'),
      run(108, 272, 400, 'the next paragraph'),
    ])

    const region = previewRegion({
      linkText: '3.2',
      destination: xyz(3, 108, 200),
      pageText: pages({ 3: headingPage }),
      landings: [],
    })

    expect((region?.rect.origin.y ?? 0) + (region?.rect.size.height ?? 0)).toBe(
      234,
    )
  })

  it('starts at the top of the page when there is no position and no list', () => {
    const region = previewRegion({
      linkText: '2',
      destination: fitPage(4),
      pageText: pages({ 4: page([run(72, 72, 460, 'section heading')]) }),
      landings: [],
    })

    expect(region?.rect.origin).toEqual({ x: 0, y: 0 })
  })

  it('gives the last entry on a page a fallback height, clamped to the page', () => {
    const { page: references, tops } = numberedList(10, 14, 700)

    const region = previewRegion({
      linkText: 'Zhu',
      destination: xyz(12, 108, tops[14] ?? 0),
      pageText: pages({ 12: references }),
      landings: landingsAt(12, 108, tops),
    })

    const bottom =
      (region?.rect.origin.y ?? 0) + (region?.rect.size.height ?? 0)
    expect(bottom).toBe(HEIGHT)
  })

  it('never previews taller than the cap', () => {
    const { page: references, tops } = numberedList(10, 10)

    const region = previewRegion({
      linkText: 'Author',
      destination: xyz(2, 108, tops[10] ?? 0),
      pageText: pages({ 2: references }),
      landings: [{ pageIndex: 2, x: 108, y: (tops[10] ?? 0) + 600 }],
    })

    expect(region?.rect.size.height).toBe(240 + 3)
  })

  it('previews a target with no text around it at a usable width', () => {
    // A figure: nothing to measure a column from.
    const region = previewRegion({
      linkText: 'Fig 2',
      destination: xyz(7, 90, 200),
      pageText: pages({ 7: page([]) }),
      landings: [],
    })

    expect(region?.rect.size.width).toBeGreaterThanOrEqual(100)
    expect(
      (region?.rect.origin.x ?? 0) + (region?.rect.size.width ?? 0),
    ).toBeLessThanOrEqual(WIDTH)
  })

  it('previews nothing for a destination outside the document', () => {
    expect(
      previewRegion({
        linkText: '3',
        destination: xyz(40, 108, 100),
        pageText: pages({}),
        landings: [],
      }),
    ).toBeNull()
  })
})
