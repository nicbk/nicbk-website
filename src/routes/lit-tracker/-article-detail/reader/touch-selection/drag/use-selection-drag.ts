import type { Position } from '@embedpdf/models'
import type { ScrollScope } from '@embedpdf/plugin-scroll'
import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { glyphAt } from '@embedpdf/plugin-selection'
import type { ViewportScope } from '@embedpdf/plugin-viewport'
import { useEffect, useRef } from 'react'
import type { SelectionEnd } from '../extend-selection'
import { extendSelection } from '../extend-selection'
import { readerPanel, readerPanelScroll } from '../reader-panel'
import type { DragInFlight } from '../selection-state'
import {
  endDrag,
  markTouchApply,
  moveDrag,
  noteSelection,
  readTouchSelection,
  resetTouchSelection,
  subscribeTouchSelection,
} from '../selection-state'
import { autoScrollRate, nextScrollOffset } from './auto-scroll'
import { pageUnder } from './page-under'

/**
 * The handle drag, owned by the document rather than by a page.
 *
 * **Why it had to move up here.** A handle is drawn inside the page that owns
 * its end of the selection, and it takes the pointer capture with it. The moment
 * a dragged boundary lands on the next page, that handle has nothing to mark:
 * it unmounts, and — quite deliberately, because a page can be scrolled out of
 * the virtualized window with a finger still on it — its cleanup ends the drag.
 * So the gesture died exactly at the break this task exists to cross. Nothing
 * about a drag is really the page's: which boundary is held, where the finger
 * is, and how fast the paper should move are all facts about the document.
 *
 * What is left to the page is drawing: `touch-selection.tsx` still puts the
 * handles on the selection and the lens over the finger, from the state this
 * keeps. What this owns is the gesture itself:
 *
 * - **The finger is followed at the window, on the capture phase.** The handle
 *   stops pointer events from reaching the page beneath it, so a listener that
 *   waited for them to bubble would hear nothing at all while the handle still
 *   existed — and nothing about which listener runs first would be decided by
 *   this project (`AGENTS.md`). Capture puts this ahead of both, always.
 * - **The boundary is placed by asking the library which page is under the
 *   finger**, never the DOM: by then the finger is over a handle, and often
 *   under a magnifier. See `page-under.ts`.
 * - **The paper scrolls while the finger rests near an edge**, at the rate
 *   `auto-scroll.ts` decides, and the boundary is re-placed on every frame — the
 *   finger is still, but the paper under it is not.
 * - **A page whose geometry has not loaded is not waited for.** There is no
 *   glyph to ask for, so the boundary stays where it was and lands as soon as
 *   the page is ready, while the paper keeps moving. Pages are rendered two
 *   ahead of the one being read, so this is brief when it happens at all.
 *
 * Mounted once, in `pdf-reader.tsx`, beside the reader's other document-scope
 * concerns.
 */

interface SelectionDrag {
  documentId: string
  selection: SelectionCapability | null
  /** The scroll plugin, for where each visible page is. */
  scroll: ScrollScope | null
  /** The viewport, for moving the paper under the finger. */
  viewport: ViewportScope | null
}

export function useSelectionDrag({
  documentId,
  selection,
  scroll,
  viewport,
}: SelectionDrag): void {
  /*
   * The capabilities arrive after the plugins register and can change identity
   * on any render; the gesture below is installed once and must not be torn
   * down mid-drag to pick them up. Held in a ref, as the reader's other pointer
   * machinery does.
   */
  const latest = useRef({ documentId, selection, scroll, viewport })
  latest.current = { documentId, selection, scroll, viewport }

  /**
   * The document's one subscription to what is selected.
   *
   * Per page before this task, which meant every mounted page heard every
   * change and only one of them could tell whether a finger had made it.
   */
  useEffect(() => {
    if (!selection) {
      return
    }
    return selection.onSelectionChange((event) => {
      if (event.documentId !== documentId) {
        return
      }
      noteSelection(event.selection)
    })
  }, [selection, documentId])

  useEffect(() => {
    /** The auto-scroll's frame, or null when the paper is still. */
    let frame: number | null = null
    /** When the last frame ran, so a rate in pixels per second means something. */
    let lastFrame = 0

    /**
     * Moves the held boundary to whatever is under the finger, and reports
     * which boundary the finger holds afterwards — dragging one end past the
     * other swaps them.
     *
     * Every way of failing to find a glyph leaves the selection exactly as it
     * was: off the text, in a margin, over the gap between two pages, or on a
     * page whose geometry has not arrived. That is the behaviour a handle
     * already had at the edge of its own page, and it is why crossing a break
     * needs no special case.
     */
    function placeBoundary(drag: DragInFlight, finger: Position): SelectionEnd {
      const {
        documentId: id,
        selection: plugin,
        scroll: pages,
      } = latest.current
      const metrics = pages?.getMetrics()
      const range = readTouchSelection().range
      if (!plugin || !metrics || !range) {
        return drag.end
      }

      const panel = readerPanel()
      const hit = pageUnder(metrics.pageVisibilityMetrics, {
        x: finger.x - panel.left,
        y: finger.y - panel.top,
      })
      if (!hit) {
        return drag.end
      }

      const geometry = geometryOf(plugin, id, hit.pageIndex)
      if (!geometry) {
        return drag.end
      }

      const glyph = glyphAt(geometry, hit.point)
      if (glyph === -1) {
        return drag.end
      }

      const outcome = extendSelection({
        dragging: drag.end,
        range,
        to: { page: hit.pageIndex, index: glyph },
      })
      markTouchApply()
      plugin.setSelection(outcome.range, id)
      return outcome.dragging
    }

    /** One report of where the finger is: the selection, then the lens. */
    function place(finger: Position): void {
      const drag = readTouchSelection().drag
      if (!drag) {
        return
      }
      // The lens follows the finger even where there is no glyph to land on —
      // task 4's rule, kept: a lens that froze would read as the drag having
      // ended, which over the gap between two pages is exactly when the reader
      // needs it most.
      moveDrag(finger, placeBoundary(drag, finger))
    }

    function step(now: number): void {
      const drag = readTouchSelection().drag
      if (!drag) {
        stopScrolling()
        return
      }

      const elapsed = now - lastFrame
      lastFrame = now

      const rate = autoScrollRate(drag.finger.y, readerPanel())
      const viewport = latest.current.viewport
      // Where the paper is now, from the element; where it goes, through the
      // plugin. `readerPanelScroll` explains why the two come from different
      // places, and what it cost to find out.
      const scrolled = readerPanelScroll()
      if (rate !== 0 && viewport && scrolled) {
        viewport.scrollTo({
          x: viewport.getMetrics().scrollLeft,
          y: nextScrollOffset({
            from: scrolled.top,
            rate,
            elapsed,
            furthest: scrolled.furthest,
          }),
        })
        // The finger has not moved; the paper under it has. Without this the
        // selection would sit still while the page slid past it.
        place(drag.finger)
      }

      /*
       * Scheduled last, and `frame` is never cleared here: `place` above
       * publishes, which calls the watcher below, which would otherwise see no
       * frame in flight and start a second loop over the same drag.
       */
      frame = requestAnimationFrame(step)
    }

    function startScrolling(): void {
      if (frame !== null) {
        return
      }
      lastFrame = performance.now()
      frame = requestAnimationFrame(step)
    }

    function stopScrolling(): void {
      if (frame === null) {
        return
      }
      cancelAnimationFrame(frame)
      frame = null
    }

    function whileMoving(event: PointerEvent): void {
      const drag = readTouchSelection().drag
      if (!drag || event.pointerId !== drag.pointerId) {
        return
      }
      place({ x: event.clientX, y: event.clientY })
    }

    function whenLifted(event: PointerEvent): void {
      const drag = readTouchSelection().drag
      if (!drag || event.pointerId !== drag.pointerId) {
        return
      }
      endDrag()
      stopScrolling()
    }

    /*
     * The paper starts moving when a handle is taken hold of, not when the
     * finger first moves: a reader can grab a handle at the bottom of the panel
     * and simply hold it there, which is a request to scroll and involves no
     * movement at all.
     */
    const unwatch = subscribeTouchSelection((next) => {
      if (next.drag) {
        startScrolling()
      } else {
        stopScrolling()
      }
    })

    window.addEventListener('pointermove', whileMoving, { capture: true })
    window.addEventListener('pointerup', whenLifted, { capture: true })
    window.addEventListener('pointercancel', whenLifted, { capture: true })

    return () => {
      unwatch()
      stopScrolling()
      window.removeEventListener('pointermove', whileMoving, { capture: true })
      window.removeEventListener('pointerup', whenLifted, { capture: true })
      window.removeEventListener('pointercancel', whenLifted, { capture: true })
      // The state above outlives this component's module, so a reader who
      // closes one paper must not leave a selection behind for the next.
      resetTouchSelection()
    }
  }, [])
}

/**
 * A page's text geometry, or null.
 *
 * **Guarded because the plugin throws** for a document it does not know — a
 * reader closing a paper mid-drag would otherwise take the frame loop down with
 * it. Null is the same answer a page with no text gives, and both mean "leave
 * the boundary where it is".
 */
function geometryOf(
  selection: SelectionCapability,
  documentId: string,
  pageIndex: number,
) {
  try {
    return selection.getState(documentId).geometry[pageIndex] ?? null
  } catch {
    return null
  }
}
