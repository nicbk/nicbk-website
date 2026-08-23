import type { PdfPageGeometry } from '@embedpdf/models'
import type { PageVisibilityMetrics } from '@embedpdf/plugin-scroll'
import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { render } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { READER_PANEL_ATTRIBUTE } from '../reader-panel'
import {
  beginDrag,
  markTouchApply,
  readTouchSelection,
  resetTouchSelection,
} from '../selection-state'
import {
  centreOfGlyph,
  geometryFrom,
  LINE_HEIGHT,
} from '../test-support/page-geometry'
import { AUTO_SCROLL_BAND } from './auto-scroll'
import { useSelectionDrag } from './use-selection-drag'

/**
 * The drag, driven the way the browser drives it: a handle is grabbed, and from
 * then on everything arrives at the window.
 *
 * The library is stood in for — its selection state is a plugin over a
 * WebAssembly engine, and its scroll metrics come from a laid-out document — but
 * the decisions are real: real geometry, the real `glyphAt`, the real range
 * arithmetic, the real hit test and the real rate curve.
 */

const DOCUMENT_ID = '018f5b6c-0000-7000-8000-000000000001'

const FIRST_PAGE = geometryFrom([
  { text: 'attention is all', y: 0 },
  { text: 'you need more', y: LINE_HEIGHT },
])

const SECOND_PAGE = geometryFrom([
  { text: 'than a recurrent', y: 0 },
  { text: 'encoder ever was', y: LINE_HEIGHT },
])

/** Where each page sits in the panel: 300px of the first, then a gap, then the second. */
const FIRST_PAGE_TOP = 0
const FIRST_PAGE_HEIGHT = 300
const SECOND_PAGE_TOP = 320

/** The panel, as tall as the two pages it shows part of. */
const PANEL = { left: 0, top: 0, right: 600, bottom: 600 }

const library = {
  geometry: {} as Record<number, PdfPageGeometry | undefined>,
  applied: [] as (SelectionRangeX | null)[],
  scrolledTo: [] as { x: number; y: number }[],
  scrollTop: 0,
  listeners: [] as ((event: unknown) => void)[],
}

/** The plugin's own shape for "part of this page is on screen here". */
function visible(pageNumber: number, top: number, height: number) {
  return {
    pageNumber,
    viewportX: 0,
    viewportY: top,
    visiblePercentage: 100,
    original: {
      pageX: 0,
      pageY: 0,
      visibleWidth: 600,
      visibleHeight: height,
      scale: 1,
    },
    scaled: {
      pageX: 0,
      pageY: 0,
      visibleWidth: 600,
      visibleHeight: height,
      scale: 1,
    },
  } satisfies PageVisibilityMetrics
}

const selection = {
  getState: () => ({ geometry: library.geometry }),
  setSelection: (range: SelectionRangeX | null) => {
    library.applied.push(range)
    for (const listener of library.listeners) {
      listener({ documentId: DOCUMENT_ID, selection: range })
    }
  },
  onSelectionChange: (listener: (event: unknown) => void) => {
    library.listeners.push(listener)
    return () => {
      library.listeners = library.listeners.filter((each) => each !== listener)
    }
  },
} as never

const scroll = {
  getMetrics: () => ({
    pageVisibilityMetrics: [
      visible(1, FIRST_PAGE_TOP, FIRST_PAGE_HEIGHT),
      visible(2, SECOND_PAGE_TOP, 300),
    ],
  }),
} as never

/**
 * The viewport plugin, which is written to but not read from: where the paper
 * *is* comes from the panel element, because the plugin's own copy lags by a
 * frame or two and the loop would compound it. See `readerPanelScroll`.
 */
const viewport = {
  getMetrics: () => ({ scrollLeft: 0 }),
  scrollTo: ({ x, y }: { x: number; y: number }) => {
    library.scrolledTo.push({ x, y })
    // What the real `Viewport` does with the request, and what the next frame
    // will read back.
    library.scrollTop = y
  },
} as never

function Reader() {
  useSelectionDrag({ documentId: DOCUMENT_ID, selection, scroll, viewport })
  return null
}

function pointerEvent(type: string, x: number, y: number, pointerId = 1) {
  return new PointerEvent(type, {
    pointerId,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  })
}

/** A finger that has already grabbed the end handle of a selection. */
function grabTheEndHandle(range: SelectionRangeX, at = { x: 155, y: 6 }) {
  markTouchApply()
  act(() => {
    for (const listener of library.listeners) {
      listener({ documentId: DOCUMENT_ID, selection: range })
    }
  })
  act(() => {
    beginDrag({ end: 'end', finger: at, pointerId: 1 })
  })
}

function moveFingerTo(x: number, y: number, pointerId = 1) {
  act(() => {
    window.dispatchEvent(pointerEvent('pointermove', x, y, pointerId))
  })
}

/** "attention", as a hold on the first page would have selected it. */
const A_WORD: SelectionRangeX = {
  start: { page: 0, index: 0 },
  end: { page: 0, index: 8 },
}

beforeEach(() => {
  resetTouchSelection()
  library.geometry = { 0: FIRST_PAGE, 1: SECOND_PAGE }
  library.applied = []
  library.scrolledTo = []
  library.scrollTop = 0
  library.listeners = []

  const panel = document.createElement('div')
  panel.setAttribute(READER_PANEL_ATTRIBUTE, '')
  panel.getBoundingClientRect = () =>
    ({ ...PANEL, width: 600, height: 600 }) as DOMRect
  // jsdom lays nothing out, so the panel is told how far it has scrolled and
  // how far it could — the two numbers the loop reads back every frame.
  Object.defineProperty(panel, 'scrollTop', {
    get: () => library.scrollTop,
    configurable: true,
  })
  Object.defineProperty(panel, 'scrollHeight', {
    get: () => 5000,
    configurable: true,
  })
  Object.defineProperty(panel, 'clientHeight', {
    get: () => PANEL.bottom,
    configurable: true,
  })
  document.body.append(panel)
})

afterEach(() => {
  document.querySelector(`[${READER_PANEL_ATTRIBUTE}]`)?.remove()
  vi.useRealTimers()
})

describe('extending a selection', () => {
  it('moves the held boundary to the glyph under the finger', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD)

    moveFingerTo(centreOfGlyph(FIRST_PAGE, 11).x, 6)

    expect(library.applied.at(-1)).toEqual({
      start: { page: 0, index: 0 },
      end: { page: 0, index: 11 },
    })
  })

  it('carries the boundary onto the next page', () => {
    /*
     * The whole task. Before it, the handle that was being dragged unmounted at
     * this moment — its page no longer had an end to mark — and took the
     * gesture with it.
     */
    render(<Reader />)
    grabTheEndHandle(A_WORD)

    const onward = centreOfGlyph(SECOND_PAGE, 6)
    moveFingerTo(onward.x, SECOND_PAGE_TOP + onward.y)

    expect(library.applied.at(-1)).toEqual({
      start: { page: 0, index: 0 },
      end: { page: 1, index: 6 },
    })
  })

  it('comes back again when the finger is dragged back', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD)

    const onward = centreOfGlyph(SECOND_PAGE, 6)
    moveFingerTo(onward.x, SECOND_PAGE_TOP + onward.y)
    moveFingerTo(centreOfGlyph(FIRST_PAGE, 11).x, 6)

    expect(library.applied.at(-1)).toEqual({
      start: { page: 0, index: 0 },
      end: { page: 0, index: 11 },
    })
  })

  it('swaps the end it holds when dragged past the anchor', () => {
    // "is", the third word: dragging its end handle back before its start makes
    // the finger the holder of the *start*, and the anchor stays where it was.
    render(<Reader />)
    grabTheEndHandle({
      start: { page: 0, index: 10 },
      end: { page: 0, index: 11 },
    })

    moveFingerTo(centreOfGlyph(FIRST_PAGE, 3).x, 6)

    expect(readTouchSelection().drag?.end).toBe('start')
    expect(library.applied.at(-1)).toEqual({
      start: { page: 0, index: 3 },
      end: { page: 0, index: 10 },
    })
  })

  it('hears the finger even though the handle hides it from the page', () => {
    /*
     * The handle stops pointer events so the library's text handler cannot drag
     * a selection of its own out from under this one. Listening at the window on
     * the capture phase is what puts this ahead of that — an ordering this
     * project decided rather than inherited (AGENTS.md).
     */
    render(<Reader />)
    grabTheEndHandle(A_WORD)

    const handle = document.createElement('span')
    handle.addEventListener('pointermove', (event) => event.stopPropagation())
    document.body.append(handle)

    act(() => {
      handle.dispatchEvent(
        pointerEvent('pointermove', centreOfGlyph(FIRST_PAGE, 11).x, 6),
      )
    })

    expect(library.applied.at(-1)).toEqual({
      start: { page: 0, index: 0 },
      end: { page: 0, index: 11 },
    })
    handle.remove()
  })

  it('leaves the boundary alone over the gap between two pages', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD)
    library.applied = []

    moveFingerTo(100, FIRST_PAGE_HEIGHT + 8)

    expect(library.applied).toHaveLength(0)
    // The lens still follows: a lens that froze there would read as the drag
    // having ended.
    expect(readTouchSelection().drag?.finger.y).toBe(FIRST_PAGE_HEIGHT + 8)
  })

  it('leaves the boundary alone on a page whose geometry has not arrived', () => {
    // Settled with the user: the boundary waits and lands when the page is
    // ready, rather than the paper stopping for a condition nobody can see.
    library.geometry = { 0: FIRST_PAGE }
    render(<Reader />)
    grabTheEndHandle(A_WORD)
    library.applied = []

    const onward = centreOfGlyph(SECOND_PAGE, 6)
    moveFingerTo(onward.x, SECOND_PAGE_TOP + onward.y)

    expect(library.applied).toHaveLength(0)
  })

  it('ignores a finger that did not grab the handle', () => {
    // A second finger is a pinch, and the reader's other hand is not a drag.
    render(<Reader />)
    grabTheEndHandle(A_WORD)
    library.applied = []

    moveFingerTo(centreOfGlyph(FIRST_PAGE, 11).x, 6, 2)

    expect(library.applied).toHaveLength(0)
  })

  it('stops when the finger lets go', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD)

    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 200, 6))
    })
    library.applied = []
    moveFingerTo(centreOfGlyph(FIRST_PAGE, 11).x, 6)

    expect(readTouchSelection().drag).toBeNull()
    expect(library.applied).toHaveLength(0)
  })

  it('stops when the browser takes the gesture away', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD)

    act(() => {
      window.dispatchEvent(pointerEvent('pointercancel', 200, 6))
    })

    expect(readTouchSelection().drag).toBeNull()
  })
})

describe('the paper moving under the finger', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('scrolls while a handle is held near the edge, without the finger moving', () => {
    // The case the curve was chosen for: a reader holds the handle at the
    // bottom of the panel and waits for the next lines to arrive.
    render(<Reader />)
    grabTheEndHandle(A_WORD, { x: 100, y: PANEL.bottom - AUTO_SCROLL_BAND / 2 })

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(library.scrolledTo.length).toBeGreaterThan(0)
    expect(library.scrollTop).toBeGreaterThan(0)
  })

  it('leaves the paper alone while the finger is in the middle of the panel', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD, { x: 100, y: 300 })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(library.scrolledTo).toHaveLength(0)
  })

  it('stops the moment the finger lets go', () => {
    render(<Reader />)
    grabTheEndHandle(A_WORD, { x: 100, y: PANEL.bottom - 4 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    act(() => {
      window.dispatchEvent(pointerEvent('pointerup', 100, PANEL.bottom - 4))
    })
    const afterRelease = library.scrolledTo.length
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(library.scrolledTo).toHaveLength(afterRelease)
  })

  it('stops when the reader closes the paper mid-drag', () => {
    const { unmount } = render(<Reader />)
    grabTheEndHandle(A_WORD, { x: 100, y: PANEL.bottom - 4 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    unmount()
    const afterClose = library.scrolledTo.length
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(library.scrolledTo).toHaveLength(afterClose)
    // And nothing is left for the next paper to inherit.
    expect(readTouchSelection().drag).toBeNull()
  })
})

describe('what the document hears about the selection', () => {
  it('records what the library reports, once, for every page', () => {
    render(<Reader />)

    act(() => {
      for (const listener of library.listeners) {
        listener({ documentId: DOCUMENT_ID, selection: A_WORD })
      }
    })

    expect(readTouchSelection().range).toEqual(A_WORD)
  })

  it('ignores a selection belonging to another paper', () => {
    render(<Reader />)

    act(() => {
      for (const listener of library.listeners) {
        listener({ documentId: 'another-paper', selection: A_WORD })
      }
    })

    expect(readTouchSelection().range).toBeNull()
  })
})
