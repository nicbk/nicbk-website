import { PdfAnnotationSubtype } from '@embedpdf/models'
import { describe, expect, it } from 'vitest'
import { isMarginNote, marginNoteFrom } from './margin-note'

const RECT = { origin: { x: 32, y: 300 }, size: { width: 72, height: 40 } }

function note() {
  return marginNoteFrom({
    defaults: { fontSize: 8, fontColor: '#E44234', contents: 'Insert text' },
    id: 'note-1',
    pageIndex: 2,
    rect: RECT,
    highlightId: 'highlight-1',
    created: new Date(0),
  })
}

describe('marginNoteFrom', () => {
  it('answers its highlight', () => {
    expect(note().inReplyToId).toBe('highlight-1')
  })

  // Its place is the passage's: the engine must refuse to move it.
  it('is locked', () => {
    expect(note().flags).toContain('locked')
  })

  it('is a text box with the tool’s own look, opened empty', () => {
    const made = note()
    expect(made.type).toBe(PdfAnnotationSubtype.FREETEXT)
    expect(made.fontSize).toBe(8)
    expect(made.fontColor).toBe('#E44234')
    expect(made.contents).toBe('')
    expect(made.rect).toEqual(RECT)
    expect(made.pageIndex).toBe(2)
  })
})

describe('isMarginNote', () => {
  it('recognises one', () => {
    expect(isMarginNote(note())).toBe(true)
  })

  // A text box placed by hand keeps its freedom to move.
  it('does not mistake a text box placed by hand for one', () => {
    const { inReplyToId: _, ...byHand } = note()
    expect(isMarginNote(byHand)).toBe(false)
  })

  it('does not mistake an unlocked reply for one', () => {
    expect(isMarginNote({ ...note(), flags: ['print'] })).toBe(false)
  })
})
