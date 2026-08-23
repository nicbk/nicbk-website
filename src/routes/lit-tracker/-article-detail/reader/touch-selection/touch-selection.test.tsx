import type { PdfPageGeometry } from '@embedpdf/models'
import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { render } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SELECTION_HANDLE_ATTRIBUTE } from './selection-handles'
import {
  centreOfGlyph,
  geometryFrom,
  LINE_HEIGHT,
} from './test-support/page-geometry'

/**
 * What a page draws: that a hold becomes a selection, that a selection made by
 * touch grows handles and one made by a mouse does not, and that each page draws
 * the end of a selection that falls on it — including one that arrived from the
 * page before.
 *
 * **The drag itself is not here**, because it is no longer the page's: a handle
 * is unmounted the moment its boundary crosses onto the next page, so the
 * gesture is owned by the document and tested in
 * `drag/use-selection-drag.test.tsx`. What this asserts is the drawing, and the
 * one gesture that does begin on a page — the hold.
 *
 * The library is stood in for; the decisions are real — real geometry, the real
 * word expansion, the real handle placement.
 */

const FIRST_PAGE = geometryFrom([
  { text: 'attention is all', y: 0 },
  { text: 'you need more', y: LINE_HEIGHT },
])

const SECOND_PAGE = geometryFrom([{ text: 'than a recurrent', y: 0 }])

const DOCUMENT_ID = '018f5b6c-0000-7000-8000-000000000001'

const selection = vi.hoisted(() => ({
  geometry: {} as Record<number, PdfPageGeometry | undefined>,
  setSelection: vi.fn(),
}))

vi.mock('@embedpdf/core/react', () => ({
  useDocumentState: () => ({ scale: 1 }),
}))

vi.mock('@embedpdf/plugin-selection/react', () => ({
  useSelectionCapability: () => ({
    provides: {
      getState: () => ({ geometry: selection.geometry }),
      getHighlightRectsForPage: () => [],
      setSelection: selection.setSelection,
    },
  }),
}))

/** Captures the callback the hold would fire, so a hold can be staged directly. */
const hold = vi.hoisted(() => ({
  fire: null as ((point: { x: number; y: number }) => void) | null,
}))

vi.mock('./use-hold-to-select', () => ({
  useHoldToSelect: ({
    onHold,
  }: {
    onHold: (point: { x: number; y: number }) => void
  }) => {
    hold.fire = onHold
  },
}))

const { TouchSelection } = await import('./touch-selection')
const {
  beginDrag,
  endDrag,
  markTouchApply,
  noteSelection,
  readTouchSelection,
  resetTouchSelection,
} = await import('./selection-state')

/**
 * Stands in for `use-selection-drag.ts`, which owns the document's one
 * subscription to the library: applying a selection is what makes it known.
 */
function applied(range: SelectionRangeX | null, byTouch = true) {
  act(() => {
    if (byTouch) {
      markTouchApply()
    }
    noteSelection(range)
  })
}

function renderPage(pageIndex = 0) {
  return render(
    <TouchSelection documentId={DOCUMENT_ID} pageIndex={pageIndex} />,
  )
}

/** Selects a word by holding on it, the way the gesture would. */
function holdOn(glyphIndex: number) {
  act(() => {
    hold.fire?.(centreOfGlyph(FIRST_PAGE, glyphIndex))
  })
}

function gripsIn(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLElement>(
      `[${SELECTION_HANDLE_ATTRIBUTE}]`,
    ),
  ].map((grip) => grip.dataset['selectionHandle'])
}

/** "attention", as the hold below selects it. */
const A_WORD: SelectionRangeX = {
  start: { page: 0, index: 0 },
  end: { page: 0, index: 8 },
}

/** A passage that begins on the first page and ends on the second. */
const ACROSS_PAGES: SelectionRangeX = {
  start: { page: 0, index: 0 },
  end: { page: 1, index: 6 },
}

beforeEach(() => {
  resetTouchSelection()
  selection.geometry = { 0: FIRST_PAGE, 1: SECOND_PAGE }
  hold.fire = null
  vi.clearAllMocks()
})

describe('the hold', () => {
  it('selects the word a hold rested on', () => {
    renderPage()

    holdOn(4)

    // "attention", the first nine characters — the library's own word
    // expansion, reached through this component's hold.
    expect(selection.setSelection).toHaveBeenCalledWith(A_WORD, DOCUMENT_ID)
  })

  it('holds nothing when the page has no text under the finger', () => {
    renderPage()

    act(() => {
      hold.fire?.({ x: 500, y: 900 })
    })

    expect(selection.setSelection).not.toHaveBeenCalled()
  })

  it('holds nothing on a page whose geometry has not arrived', () => {
    selection.geometry = {}
    renderPage()

    holdOn(4)

    expect(selection.setSelection).not.toHaveBeenCalled()
  })
})

describe('the handles', () => {
  it('grows one at each end of what a finger selected', () => {
    const { container } = renderPage()

    applied(A_WORD)

    expect(gripsIn(container)).toEqual(['start', 'end'])
  })

  it('draws none for a selection it did not make', () => {
    /*
     * The judgement this reader exists to make. A mouse drag produces the same
     * event from the same plugin; handles are a touch affordance, and #9's
     * pointer selection is not to acquire them.
     */
    const { container } = renderPage()

    applied(A_WORD, false)

    expect(gripsIn(container)).toHaveLength(0)
  })

  it('takes them away when the selection goes', () => {
    // Escape, or a click on the paper: the plugin reports null, and there is
    // nothing left for a handle to bound.
    const { container } = renderPage()
    applied(A_WORD)

    applied(null)

    expect(gripsIn(container)).toHaveLength(0)
  })

  it('draws only the end that falls on this page', () => {
    // The two halves of a selection that spans a break, each drawn by the page
    // that owns it — and the second page knows the selection was a finger's,
    // which it could not have known while that was per-page state.
    const first = renderPage(0)
    const second = renderPage(1)

    applied(ACROSS_PAGES)

    expect(gripsIn(first.container)).toEqual(['start'])
    expect(gripsIn(second.container)).toEqual(['end'])
  })
})

describe('the lens', () => {
  /*
   * Portalled to the document rather than drawn in the page, because it has to
   * float above the reader's own toolbar and sidebar. jsdom paints no canvas —
   * the component declines gracefully when there is no drawing context — so what
   * is asserted is that it is mounted and unmounted at the right moments, by the
   * right page.
   */
  function lens() {
    return document.querySelector('canvas')
  }

  it('appears while a handle is held, and only then', () => {
    renderPage()
    applied(A_WORD)
    expect(lens()).toBeNull()

    act(() => {
      beginDrag({ end: 'end', finger: { x: 90, y: 6 }, pointerId: 1 })
    })
    expect(lens()).not.toBeNull()

    act(() => {
      endDrag()
    })
    expect(lens()).toBeNull()
  })

  it('is drawn by the page the dragged boundary is on', () => {
    // What carries it across a break: while the finger is over the gap the lens
    // still shows the last line a boundary could be placed on, and it moves to
    // the next page at the moment the boundary does.
    renderPage(1)
    applied(ACROSS_PAGES)

    act(() => {
      beginDrag({ end: 'end', finger: { x: 40, y: 400 }, pointerId: 1 })
    })

    expect(lens()).not.toBeNull()
  })

  it('is not drawn by a page holding the other end', () => {
    renderPage(0)
    applied(ACROSS_PAGES)

    act(() => {
      beginDrag({ end: 'end', finger: { x: 40, y: 400 }, pointerId: 1 })
    })

    expect(lens()).toBeNull()
  })
})

describe('a drag that outlives the page it began on', () => {
  it('survives the handle being unmounted by its own crossing', () => {
    /*
     * The failure this task exists to remove. The end handle is drawn by the
     * first page until the boundary reaches the second, and then that handle is
     * gone — which used to end the very gesture that moved it.
     */
    const { container } = renderPage(0)
    applied(A_WORD)
    act(() => {
      beginDrag({ end: 'end', finger: { x: 90, y: 6 }, pointerId: 1 })
    })
    expect(gripsIn(container)).toEqual(['start', 'end'])

    applied(ACROSS_PAGES)

    expect(gripsIn(container)).toEqual(['start'])
    expect(readTouchSelection().drag).not.toBeNull()
  })
})
