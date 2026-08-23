import { useDocumentState } from '@embedpdf/core/react'
import type { PdfPageGeometry, Rect } from '@embedpdf/models'
import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { useSelectionCapability } from '@embedpdf/plugin-selection/react'
import { useRef } from 'react'
import { PAPER_ATTRIBUTE } from '../blank-paper'
import { handleAnchors } from './handle-anchors'
import { Magnifier } from './magnifier'
import { panelAround } from './reader-panel'
import { SelectionHandles } from './selection-handles'
import { beginDrag, markTouchApply, useTouchSelection } from './selection-state'
import { useHoldToSelect } from './use-hold-to-select'
import { wordAt } from './word-at'
import styles from './touch-selection.module.css'

/**
 * Selecting a passage with a finger: what each page draws, and the one gesture
 * that begins on a page.
 *
 * The decided model has three parts — **a long press selects the word under the
 * finger**, **a handle at each end adjusts it**, and **a magnifier follows the
 * finger** while one is being dragged — and each decision lives in the module
 * that makes it. This is the wiring.
 *
 * **Rendered once per page, and it draws only what falls on its own page.** The
 * selection itself, and the drag adjusting it, belong to the document:
 * `selection-state.ts` holds them and `drag/use-selection-drag.ts` drives them,
 * because a passage can span pages and a finger can drag a boundary across one.
 * What is left here needs a page to mean anything at all — this page's geometry,
 * this page's rendered paper, this page's coordinates.
 *
 * **The handles are a touch affordance**: a pointer drags a selection directly
 * and has never needed them, so they are drawn only for a selection a finger
 * made, and the first mouse selection afterwards takes them away again.
 */

interface TouchSelectionProps {
  documentId: string
  pageIndex: number
}

export function TouchSelection({ documentId, pageIndex }: TouchSelectionProps) {
  const { provides: selection } = useSelectionCapability()
  const documentState = useDocumentState(documentId)
  const scale = documentState?.scale ?? 1

  const layer = useRef<HTMLDivElement>(null)
  const { range, madeByTouch, drag } = useTouchSelection()

  useHoldToSelect({
    documentId,
    pageIndex,
    onHold: (point) => {
      const geometry = geometryOf(selection, documentId, pageIndex)
      if (!geometry) {
        return
      }
      const word = wordAt(geometry, point, pageIndex)
      if (!word) {
        return
      }
      // Said before the selection is applied, and heard by the change event it
      // produces: the library reports every selection the same way, and this is
      // what marks this one as a finger's doing.
      markTouchApply()
      selection?.setSelection(word, documentId)
    },
  })

  const geometry = geometryOf(selection, documentId, pageIndex)
  const anchors =
    range && geometry ? handleAnchors(geometry, range, pageIndex) : null
  const showHandles =
    madeByTouch &&
    anchors !== null &&
    (anchors.start !== null || anchors.end !== null)

  /**
   * The boundary the finger is dragging, when it falls on *this* page.
   *
   * This is what carries the lens across a page break: the page holding the
   * dragged anchor draws it, so while the finger is over the gap between two
   * pages the lens still shows the last line a boundary could be placed on, and
   * it moves to the next page at the moment the boundary does.
   */
  const draggedAnchor = drag && anchors ? anchors[drag.end] : null

  return (
    <div ref={layer} className={styles.layer}>
      {showHandles && anchors && (
        <SelectionHandles
          anchors={anchors}
          scale={scale}
          onGrab={(end, finger, pointerId) =>
            beginDrag({ end, finger, pointerId })
          }
        />
      )}

      {drag && draggedAnchor && (
        /*
         * The paper and the panel are measured as the lens is drawn rather than
         * captured when the drag began. They cost one measurement each per
         * move, and a drag that crosses pages has no single page to have
         * captured them from: this component is not even the one that started
         * the gesture.
         */
        <Magnifier
          paper={paperOf(layer.current)}
          anchor={draggedAnchor}
          finger={drag.finger}
          scale={scale}
          rects={rectsOf(selection, documentId, pageIndex)}
          panel={panelAround(layer.current)}
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
