import type { Position } from '@embedpdf/models'
import type { SelectionRangeX } from '@embedpdf/plugin-selection'
import { useEffect, useState } from 'react'
import type { SelectionEnd } from './extend-selection'

/**
 * What the whole reader knows about a touch selection: the passage, whether a
 * finger made it, and the handle drag in flight.
 *
 * **Why this is not per-page state, as it was.** A selection can span pages and
 * a drag can cross one, and both of those are facts about the document rather
 * than about any page that happens to be drawing part of it. Held per page —
 * task 4's arrangement, which was right while a handle stopped at its own page's
 * edge — the moment a boundary crossed, the new page would have no idea the
 * selection had been made by touch and would decline to draw the handle the
 * finger was still holding.
 *
 * **A module-level store rather than a context**, for the same two reasons
 * `pinch/pinch.ts` is one. A context value that changed on every pointer move
 * would re-render everything under the provider — the scroller and every mounted
 * page's layers — sixty times a second, which is the cost feature #14 was spent
 * removing. And a reader shows one paper: there is one selection to describe, as
 * there is one hand. `use-selection-drag.ts` clears this when the reader
 * unmounts, so a second paper never inherits the first one's selection.
 */

/** A handle being dragged. */
export interface DragInFlight {
  /** The boundary the finger holds — it swaps if dragged past the other. */
  end: SelectionEnd
  /** Where the finger is, in client coordinates. */
  finger: Position
  /** The pointer that grabbed the handle, so no other finger drives this drag. */
  pointerId: number
}

export interface TouchSelectionState {
  /** The selected passage, as the library reports it. */
  range: SelectionRangeX | null
  /**
   * True while the current selection is one a finger made.
   *
   * Handles are a touch affordance: a pointer drags a selection directly and has
   * never needed them, so the first mouse selection takes them away again.
   */
  madeByTouch: boolean
  /** The drag in flight, or null. */
  drag: DragInFlight | null
}

const EMPTY: TouchSelectionState = {
  range: null,
  madeByTouch: false,
  drag: null,
}

let state: TouchSelectionState = EMPTY

const listeners = new Set<(next: TouchSelectionState) => void>()

/**
 * Set immediately before this reader applies a selection of its own, and
 * consumed by the change event that applying it produces.
 *
 * The library reports every selection the same way, whatever made it, so the
 * only way to know a passage was selected by a finger is to have said so a
 * moment earlier. A module-level flag rather than a ref because the two moments
 * now belong to different components — a hold happens on a page, and the change
 * is heard once for the document.
 */
let applying = false

function publish(next: TouchSelectionState): void {
  state = next
  for (const listener of listeners) {
    listener(state)
  }
}

/** The state as it stands, for handlers that must not wait for a render. */
export function readTouchSelection(): TouchSelectionState {
  return state
}

/**
 * Watches the state without rendering anything from it — what the drag's own
 * machinery uses to notice a handle being taken hold of.
 *
 * @returns the function that stops watching.
 */
export function subscribeTouchSelection(
  listener: (next: TouchSelectionState) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Says that the selection about to be applied is this reader's own doing. */
export function markTouchApply(): void {
  applying = true
}

/**
 * Records what the library now says is selected.
 *
 * Called once for the document, from `use-selection-drag.ts`. A selection that
 * arrives without `markTouchApply` was made some other way — a mouse drag, the
 * sidebar, a click — and takes the handles away.
 */
export function noteSelection(range: SelectionRangeX | null): void {
  const madeByTouch = range !== null && applying
  applying = false
  publish({ ...state, range, madeByTouch })
}

/** A handle has been taken hold of. */
export function beginDrag(drag: DragInFlight): void {
  publish({ ...state, drag })
}

/** The finger moved, and possibly onto the other boundary. */
export function moveDrag(finger: Position, end: SelectionEnd): void {
  if (!state.drag) {
    return
  }
  publish({ ...state, drag: { ...state.drag, finger, end } })
}

/** The finger let go, or the gesture was taken away. */
export function endDrag(): void {
  if (!state.drag) {
    return
  }
  publish({ ...state, drag: null })
}

/** Forgets everything: a different paper is about to be read. */
export function resetTouchSelection(): void {
  applying = false
  publish(EMPTY)
}

/**
 * Subscribes a component to the state above.
 *
 * Only the components that draw from it re-render — the handles and the
 * magnifier on each mounted page — rather than everything inside a provider.
 */
export function useTouchSelection(): TouchSelectionState {
  const [current, setCurrent] = useState(state)

  useEffect(() => {
    // Between this component's first render and this effect, a finger may
    // already have moved. Reading again here is what keeps the two in step.
    setCurrent(state)
    listeners.add(setCurrent)
    return () => {
      listeners.delete(setCurrent)
    }
  }, [])

  return current
}
