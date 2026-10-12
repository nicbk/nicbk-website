import type { Rect } from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { movePatches, pageContents } from './page-contents'

function rect(x: number, y: number, width = 72, height = 40): Rect {
  return { origin: { x, y }, size: { width, height } }
}

const highlight = {
  id: 'h',
  type: PdfAnnotationSubtype.HIGHLIGHT,
  pageIndex: 0,
  rect: rect(120, 300, 200, 10),
}
const note = {
  id: 'n',
  type: PdfAnnotationSubtype.FREETEXT,
  pageIndex: 0,
  rect: rect(32, 310),
  inReplyToId: 'h',
  flags: ['print', 'locked'],
}
const byHand = {
  id: 't',
  type: PdfAnnotationSubtype.FREETEXT,
  pageIndex: 0,
  rect: rect(32, 500),
}

function state(objects: object[], deleted: string[] = []) {
  return {
    pages: { 0: objects.map((o) => (o as { id: string }).id) },
    byUid: Object.fromEntries(
      objects.map((o) => {
        const id = (o as { id: string }).id
        return [
          id,
          {
            commitState: deleted.includes(id) ? 'deleted' : 'synced',
            object: o,
          },
        ]
      }),
    ),
  } as never
}

describe('pageContents', () => {
  it('sorts the page into margin notes, which may move, and the rest', () => {
    const { obstacles, notes } = pageContents(
      state([highlight, note, byHand]),
      0,
    )
    expect(obstacles).toEqual([highlight.rect, byHand.rect])
    expect(notes).toEqual([{ id: 'n', rect: note.rect, anchor: 300 }])
  })

  // Its highlight is gone or elsewhere: anchored where it stands.
  it('anchors a note without its highlight where it is', () => {
    const { notes } = pageContents(state([note]), 0)
    expect(notes[0]?.anchor).toBe(310)
  })

  it('ignores what is being deleted', () => {
    const { obstacles } = pageContents(state([byHand], ['t']), 0)
    expect(obstacles).toEqual([])
  })

  it('reads an empty page as empty', () => {
    expect(pageContents(state([]), 3)).toEqual({ obstacles: [], notes: [] })
  })
})

describe('movePatches', () => {
  const placed = [
    { id: 'n', rect: rect(32, 310), anchor: 300 },
    { id: 'm', rect: rect(32, 400), anchor: 400 },
  ]

  it('patches only the notes that move, keeping their x and width', () => {
    expect(movePatches(0, placed, new Map([['m', 380]]))).toEqual([
      { pageIndex: 0, id: 'm', patch: { rect: rect(32, 380) } },
    ])
  })

  it('carries a new height for the note that was resized', () => {
    expect(movePatches(0, placed, new Map(), { id: 'n', height: 66 })).toEqual([
      { pageIndex: 0, id: 'n', patch: { rect: rect(32, 310, 72, 66) } },
    ])
  })
})
