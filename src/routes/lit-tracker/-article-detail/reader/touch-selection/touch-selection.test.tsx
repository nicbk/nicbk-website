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
 * The wiring: that a hold becomes a selection, that a selection made by touch
 * grows handles and one made by a mouse does not, and that dragging a handle
 * moves the boundary it belongs to.
 *
 * The library is stood in for — its selection state is a plugin over a
 * WebAssembly engine — but the *decisions* are the real ones: real geometry,
 * the real `glyphAt`, the real word expansion, the real range arithmetic. What
 * is faked is only the store they are applied to.
 */

const PAGE = geometryFrom([
  { text: 'attention is all', y: 0 },
  { text: 'you need more', y: LINE_HEIGHT },
])

const DOCUMENT_ID = '018f5b6c-0000-7000-8000-000000000001'
const PAGE_INDEX = 0

const selection = vi.hoisted(() => ({
  range: null as unknown,
  listeners: [] as ((event: unknown) => void)[],
  geometry: null as unknown,
  setSelection: vi.fn(),
}))

vi.mock('@embedpdf/core/react', () => ({
  useDocumentState: () => ({ scale: 1 }),
}))

vi.mock('@embedpdf/plugin-selection/react', () => ({
  useSelectionCapability: () => ({
    provides: {
      getState: () => ({ geometry: { [PAGE_INDEX]: selection.geometry } }),
      getHighlightRectsForPage: () => [],
      setSelection: (range: SelectionRangeX | null) => {
        selection.setSelection(range)
        selection.range = range
        // The plugin emits a change for every selection, however it was made —
        // which is what this component listens to rather than tracking its own.
        for (const listener of selection.listeners) {
          listener({ documentId: DOCUMENT_ID, selection: range })
        }
      },
      onSelectionChange: (listener: (event: unknown) => void) => {
        selection.listeners.push(listener)
        return () => {
          selection.listeners = selection.listeners.filter(
            (each) => each !== listener,
          )
        }
      },
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

/** A press on a handle, as the browser would raise it. */
function pointerEvent(type: string, x = 0, y = 0): PointerEvent {
  return new PointerEvent(type, {
    pointerId: 1,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  })
}

function renderPage(geometry: PdfPageGeometry | null = PAGE) {
  selection.geometry = geometry
  return render(
    <TouchSelection documentId={DOCUMENT_ID} pageIndex={PAGE_INDEX} />,
  )
}

/** Selects a word by holding on it, the way the gesture would. */
function holdOn(glyphIndex: number) {
  act(() => {
    hold.fire?.(centreOfGlyph(PAGE, glyphIndex))
  })
}

function gripsIn(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLElement>(
      `[${SELECTION_HANDLE_ATTRIBUTE}]`,
    ),
  ]
}

beforeEach(() => {
  selection.range = null
  selection.listeners = []
  selection.geometry = PAGE
  hold.fire = null
  vi.clearAllMocks()
})

describe('TouchSelection', () => {
  it('selects the word a hold rested on', () => {
    renderPage()

    holdOn(4)

    // "attention", the first nine characters — the library's own word
    // expansion, reached through this component's hold.
    expect(selection.setSelection).toHaveBeenCalledWith({
      start: { page: PAGE_INDEX, index: 0 },
      end: { page: PAGE_INDEX, index: 8 },
    })
  })

  it('grows a handle at each end of what it selected', () => {
    const { container } = renderPage()

    holdOn(4)

    expect(
      gripsIn(container).map((grip) => grip.dataset['selectionHandle']),
    ).toEqual(['start', 'end'])
  })

  it('draws no handles for a selection it did not make', () => {
    /*
     * The judgement this component exists to make. A mouse drag produces the
     * same event from the same plugin; handles are a touch affordance, and #9's
     * pointer selection is not to acquire them.
     */
    const { container } = renderPage()

    act(() => {
      for (const listener of selection.listeners) {
        listener({
          documentId: DOCUMENT_ID,
          selection: {
            start: { page: PAGE_INDEX, index: 0 },
            end: { page: PAGE_INDEX, index: 8 },
          },
        })
      }
    })

    expect(gripsIn(container)).toHaveLength(0)
  })

  it('takes the handles away when the selection goes', () => {
    // Escape, or a click on the paper: the plugin reports null, and there is
    // nothing left for a handle to bound.
    const { container } = renderPage()
    holdOn(4)

    act(() => {
      for (const listener of selection.listeners) {
        listener({ documentId: DOCUMENT_ID, selection: null })
      }
    })

    expect(gripsIn(container)).toHaveLength(0)
  })

  it('holds nothing when the page has no text under the finger', () => {
    renderPage()

    act(() => {
      hold.fire?.({ x: 500, y: 900 })
    })

    expect(selection.setSelection).not.toHaveBeenCalled()
  })

  it('moves the boundary the dragged handle belongs to', () => {
    /*
     * jsdom lays nothing out, so the layer's rectangle is at the origin and a
     * client point is a page point at 100% zoom — which is exactly what makes
     * the arithmetic legible here: the finger is put on the glyph it means.
     */
    const { container } = renderPage()
    holdOn(4)
    const end = gripsIn(container)[1]

    act(() => {
      end?.dispatchEvent(pointerEvent('pointerdown', 90, 6))
    })
    act(() => {
      end?.dispatchEvent(
        pointerEvent('pointermove', centreOfGlyph(PAGE, 11).x, 6),
      )
    })

    // Still anchored where the word began, now reaching the glyph under the
    // finger — character-precise, not snapped back to a word.
    expect(selection.setSelection).toHaveBeenLastCalledWith({
      start: { page: PAGE_INDEX, index: 0 },
      end: { page: PAGE_INDEX, index: 11 },
    })
  })

  it('keeps the anchor still when a handle is dragged past the other', () => {
    const { container } = renderPage()
    holdOn(14)
    const [start] = gripsIn(container)

    act(() => {
      start?.dispatchEvent(pointerEvent('pointerdown', 130, 6))
    })
    act(() => {
      start?.dispatchEvent(
        pointerEvent('pointermove', centreOfGlyph(PAGE, 22).x, LINE_HEIGHT + 6),
      )
    })

    // "all" ends at 15; the finger is now well past it on the next line, so
    // that end became the start and the finger holds the other one.
    expect(selection.setSelection).toHaveBeenLastCalledWith({
      start: { page: PAGE_INDEX, index: 15 },
      end: { page: PAGE_INDEX, index: 22 },
    })
  })

  it('shows the lens while a handle is held, and only then', () => {
    /*
     * Portalled to the document rather than drawn in the page, because it has
     * to float above the reader's own toolbar and sidebar. jsdom paints no
     * canvas — the component declines gracefully when there is no drawing
     * context — so what is asserted here is that it is mounted and unmounted at
     * the right moments, which is the part that is this project's.
     */
    const { container } = renderPage()
    holdOn(4)
    const end = gripsIn(container)[1]

    expect(document.querySelector('canvas')).toBeNull()

    act(() => {
      end?.dispatchEvent(pointerEvent('pointerdown', 90, 6))
    })
    expect(document.querySelector('canvas')).not.toBeNull()

    act(() => {
      end?.dispatchEvent(pointerEvent('pointerup', 90, 6))
    })
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('leaves the selection alone where there is no glyph to land on', () => {
    // Dragging into a margin, or past the last line of the page — which is
    // what stops a handle at the edge of its own page until task 5 lands.
    const { container } = renderPage()
    holdOn(4)
    const end = gripsIn(container)[1]

    act(() => {
      end?.dispatchEvent(pointerEvent('pointerdown', 90, 6))
    })
    selection.setSelection.mockClear()
    act(() => {
      end?.dispatchEvent(pointerEvent('pointermove', 600, 900))
    })

    expect(selection.setSelection).not.toHaveBeenCalled()
  })
})
