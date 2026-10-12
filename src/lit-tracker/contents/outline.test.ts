import type { PdfBookmarkObject } from '@embedpdf/models'
import { PdfActionType, PdfZoomMode } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { isUsableOutline, outlineEntries } from './outline'

const HEIGHTS = [792, 792, 792]

function at(
  title: string,
  pageIndex: number,
  top: number | null,
  children?: PdfBookmarkObject[],
): PdfBookmarkObject {
  return {
    title,
    target: {
      type: 'destination',
      destination:
        top === null
          ? { pageIndex, zoom: { mode: PdfZoomMode.FitPage }, view: [] }
          : {
              pageIndex,
              zoom: {
                mode: PdfZoomMode.XYZ,
                params: { x: 72, y: 792 - top, zoom: 0 },
              },
              view: [],
            },
    },
    ...(children && { children }),
  }
}

describe('outlineEntries', () => {
  it('flattens the outline in reading order, with depth and place', () => {
    expect(
      outlineEntries(
        [
          at('1 Introduction', 0, 100, [at('1.1 Background', 1, 200)]),
          at('2 Method', 2, 50),
        ],
        HEIGHTS,
      ),
    ).toEqual([
      { title: '1 Introduction', depth: 1, pageIndex: 0, top: 100 },
      { title: '1.1 Background', depth: 2, pageIndex: 1, top: 200 },
      { title: '2 Method', depth: 1, pageIndex: 2, top: 50 },
    ])
  })

  it('goes to the top of the page when the outline names only a page', () => {
    expect(outlineEntries([at('Preface', 0, null)], HEIGHTS)[0]?.top).toBeNull()
  })

  it('follows a go-to action as it would a destination', () => {
    const viaAction: PdfBookmarkObject = {
      title: 'Appendix',
      target: {
        type: 'action',
        action: {
          type: PdfActionType.Goto,
          destination: {
            pageIndex: 2,
            zoom: { mode: PdfZoomMode.FitPage },
            view: [],
          },
        },
      },
    }
    expect(outlineEntries([viaAction], HEIGHTS)).toEqual([
      { title: 'Appendix', depth: 1, pageIndex: 2, top: null },
    ])
  })

  // A part that is only a heading still holds chapters that go somewhere.
  it('drops an entry that goes nowhere, and lifts its children', () => {
    const part: PdfBookmarkObject = {
      title: 'Part I',
      children: [at('Chapter 1', 0, 100)],
    }
    expect(outlineEntries([part], HEIGHTS)).toEqual([
      { title: 'Chapter 1', depth: 1, pageIndex: 0, top: 100 },
    ])
  })

  it('drops an entry pointing past the end of the document, or with no title', () => {
    expect(
      outlineEntries([at('Ghost', 9, 100), at('   ', 0, 100)], HEIGHTS),
    ).toEqual([])
  })
})

describe('isUsableOutline', () => {
  // The measured junk: one entry named after an HTML file.
  it('does not count a single entry as contents', () => {
    expect(
      isUsableOutline([
        { title: 'htmldoc797.html', depth: 1, pageIndex: 0, top: null },
      ]),
    ).toBe(false)
  })

  it('counts two entries', () => {
    const entry = { title: 'x', depth: 1, pageIndex: 0, top: null }
    expect(isUsableOutline([entry, entry])).toBe(true)
  })
})
