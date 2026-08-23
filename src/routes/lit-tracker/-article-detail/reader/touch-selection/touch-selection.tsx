import { useDocumentState } from '@embedpdf/core/react'
import type { PdfPageGeometry, Position, Rect } from '@embedpdf/models'
import type {
  SelectionCapability,
  SelectionRangeX,
} from '@embedpdf/plugin-selection'
import { glyphAt } from '@embedpdf/plugin-selection'
import { useSelectionCapability } from '@embedpdf/plugin-selection/react'
import { useEffect, useRef, useState } from 'react'
import { PAPER_ATTRIBUTE } from '../blank-paper'
import type { SelectionEnd } from './extend-selection'
import { extendSelection } from './extend-selection'
import { handleAnchors } from './handle-anchors'
import { Magnifier } from './magnifier'
import type { PanelBounds } from './magnifier-view'
import { panelAround } from './reader-panel'
import { SelectionHandles } from './selection-handles'
import { useHoldToSelect } from './use-hold-to-select'
import { wordAt } from './word-at'
import styles from './touch-selection.module.css'

/**
 * Selecting a passage with a finger, on one page.
 *
 * Composes the three pieces of the decided model and owns the small amount of
 * state they share: **a long press selects the word under the finger**, **a
 * handle at each end adjusts it**, and **a magnifier follows the finger** while
 * one is being dragged. Every decision behind those is in the module that makes
 * it; what is here is the wiring, and the one judgement that belongs nowhere
 * else — whether the current selection is a touch selection at all.
 *
 * **Why that judgement matters.** Handles are a touch affordance: a pointer
 * drags a selection directly and has never needed them, and #9's reader is not
 * to acquire them. So they are drawn only for a selection this component made —
 * by a hold, or by a handle drag — and the first mouse selection afterwards
 * takes them away again.
 *
 * Rendered once per page, inside the page's pointer provider, so its geometry,
 * its handlers and its coordinates are all that page's.
 */

interface TouchSelectionProps {
  documentId: string
  pageIndex: number
}

interface DragInFlight {
  /** The end the finger is holding, which changes if it is dragged past the other. */
  end: SelectionEnd
  /** Where the finger is, in client coordinates. */
  finger: Position
  /**
   * The panel and the paper, resolved once when the drag begins.
   *
   * Neither can change while a finger is down — the reader cannot resize the
   * panel or re-render the page mid-drag — so reading the DOM once at the start
   * is both cheaper and steadier than reading it on every move.
   */
  panel: PanelBounds
  paper: HTMLImageElement | null
}

export function TouchSelection({ documentId, pageIndex }: TouchSelectionProps) {
  const { provides: selection } = useSelectionCapability()
  const documentState = useDocumentState(documentId)
  const scale = documentState?.scale ?? 1

  const layer = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState<SelectionRangeX | null>(null)
  const [madeByTouch, setMadeByTouch] = useState(false)
  const [drag, setDrag] = useState<DragInFlight | null>(null)

  /**
   * Set immediately before this component applies a selection, and read by the
   * change event that applying it produces.
   *
   * A ref rather than state because it is a note passed between two moments of
   * the same turn, not something anything renders from — and because the event
   * arrives before a state update would.
   */
  const applying = useRef(false)

  /** The end of the selection the finger holds, tracked between moves. */
  const held = useRef<SelectionEnd>('end')

  function apply(next: SelectionRangeX): void {
    applying.current = true
    selection?.setSelection(next, documentId)
  }

  useHoldToSelect({
    documentId,
    pageIndex,
    onHold: (point) => {
      const geometry = geometryOf(selection, documentId, pageIndex)
      if (!geometry) {
        return
      }
      const word = wordAt(geometry, point, pageIndex)
      if (word) {
        apply(word)
      }
    },
  })

  useEffect(() => {
    if (!selection) {
      return
    }
    return selection.onSelectionChange((event) => {
      if (event.documentId !== documentId) {
        return
      }
      setRange(event.selection)
      setMadeByTouch(event.selection !== null && applying.current)
      applying.current = false
    })
  }, [selection, documentId])

  const geometry = geometryOf(selection, documentId, pageIndex)
  const anchors =
    range && geometry ? handleAnchors(geometry, range, pageIndex) : null
  const showHandles =
    madeByTouch &&
    anchors !== null &&
    (anchors.start !== null || anchors.end !== null)

  /** The boundary the finger is dragging, for the magnifier to look at. */
  const draggedAnchor =
    drag && anchors
      ? drag.end === 'start'
        ? anchors.start
        : anchors.end
      : null

  return (
    <div ref={layer} className={styles.layer}>
      {showHandles && anchors && (
        <SelectionHandles
          anchors={anchors}
          scale={scale}
          onGrab={(end, finger) => {
            held.current = end
            setDrag({
              end,
              finger,
              panel: panelAround(layer.current),
              paper: paperOf(layer.current),
            })
          }}
          onDrag={(finger) => {
            const under = glyphUnder(finger, layer.current, scale, geometry)
            if (under !== null && range) {
              const outcome = extendSelection({
                dragging: held.current,
                range,
                to: { page: pageIndex, index: under },
              })
              held.current = outcome.dragging
              apply(outcome.range)
            }
            // The lens follows the finger even where there is no glyph to land
            // on — the margins of a page, the gap below its last line — because
            // a lens that froze there would read as the drag having ended.
            setDrag((current) =>
              current ? { ...current, end: held.current, finger } : null,
            )
          }}
          onRelease={() => setDrag(null)}
        />
      )}

      {drag && draggedAnchor && (
        <Magnifier
          paper={drag.paper}
          anchor={draggedAnchor}
          finger={drag.finger}
          scale={scale}
          rects={rectsOf(selection, documentId, pageIndex)}
          panel={drag.panel}
        />
      )}
    </div>
  )
}

/**
 * The page's text geometry, or null.
 *
 * **Guarded because the plugin throws.** `getState` raises for a document it
 * does not know, and this is read during render: a reader closing a paper while
 * a page is still mounted would take the whole reader down with it. Null is the
 * same answer a page with no text gives, and everything here already handles
 * that.
 */
function geometryOf(
  selection: SelectionCapability | null,
  documentId: string,
  pageIndex: number,
): PdfPageGeometry | null {
  try {
    return selection?.getState(documentId).geometry[pageIndex] ?? null
  } catch {
    return null
  }
}

/** The selection's rectangles on this page, for the magnifier to draw. */
function rectsOf(
  selection: SelectionCapability | null,
  documentId: string,
  pageIndex: number,
): Rect[] {
  try {
    return selection?.getHighlightRectsForPage(pageIndex, documentId) ?? []
  } catch {
    return []
  }
}

/** The rendered page beside this layer — what the magnifier magnifies. */
function paperOf(layer: HTMLElement | null): HTMLImageElement | null {
  return (
    layer?.parentElement?.querySelector<HTMLImageElement>(
      `[${PAPER_ATTRIBUTE}]`,
    ) ?? null
  )
}

/**
 * The glyph under the finger, in this page's coordinates.
 *
 * The conversion is a subtraction and a division, and deliberately so: it is the
 * exact inverse of how the handles are placed (`selection-handles.tsx` multiplies
 * page coordinates by the zoom), and it matches how EmbedPDF's own selection
 * layer draws — scale, no rotation. This reader has no rotate control, and the
 * library's own highlight rectangles would be wrong before this was.
 */
function glyphUnder(
  finger: Position,
  layer: HTMLElement | null,
  scale: number,
  geometry: PdfPageGeometry | null,
): number | null {
  if (!layer || !geometry) {
    return null
  }

  const bounds = layer.getBoundingClientRect()
  const onPage = {
    x: (finger.x - bounds.left) / scale,
    y: (finger.y - bounds.top) / scale,
  }

  const glyph = glyphAt(geometry, onPage)
  // Past the edge of the text, or off the page entirely: the boundary stays
  // where it was, which is what stops a handle at the end of its own page.
  return glyph === -1 ? null : glyph
}
