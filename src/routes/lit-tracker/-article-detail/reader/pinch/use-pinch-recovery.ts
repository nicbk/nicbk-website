import type {
  SelectionCapability,
  SelectionRangeX,
} from '@embedpdf/plugin-selection'
import { useMemo, useRef } from 'react'
import { tellTheToolItsPointerWasCancelled } from '../cancel-pointer'
import type { FirstFinger } from './pinch'
import { usePinch } from './pinch'

/**
 * Undoes what the *first* finger of a pinch did before anyone knew it was one.
 *
 * `pinch-guard.tsx` withholds everything from the second finger onward, which
 * is every event a pinch has except the one that started it. That first press
 * arrives as an ordinary press and is treated as one — correctly, since a press
 * cannot know a second finger is coming — and by the time it turns out to have
 * been half of a gesture it has already done two things this reader has to take
 * back:
 *
 * - **It cleared the selection.** EmbedPDF's text handler calls `onClear` on
 *   *every* pointer-down before it anchors, so a finger landing to pinch throws
 *   away the passage the reader had selected. Since that is exactly what the
 *   user asked not to happen — a pinch "without affecting already selected
 *   text" — the selection is remembered as the finger lands and put back if the
 *   gesture turns out to be a pinch.
 * - **It started the live tool drawing.** The tool is told its pointer was
 *   cancelled, which is the only thing that makes it put down what it was
 *   holding (see `cancel-pointer.ts`).
 *
 * **One of these per reader, not one per page.** Both repairs are about the
 * document — the selection is document-wide, and the cancel is aimed at the
 * element the first finger landed on, whichever page that was.
 */

interface PinchRecovery {
  documentId: string
  /** The selection plugin, once it exists. Null for the first render or two. */
  selection: SelectionCapability | null
}

export function usePinchRecovery({
  documentId,
  selection,
}: PinchRecovery): void {
  /**
   * What was selected as the last finger landed — before the library was told
   * about that press, and so before it cleared anything.
   */
  const before = useRef<SelectionRangeX | null>(null)

  /*
   * Read inside listeners registered once. A ref rather than a dependency, so
   * that the capability arriving a tick after the first render does not tear
   * down and reinstall a window listener mid-gesture.
   */
  const latest = useRef({ documentId, selection })
  latest.current = { documentId, selection }

  /*
   * **Both halves hang off the one listener `pinch.ts` keeps**, which is not a
   * convenience: the first version of this kept a window listener of its own to
   * notice the first finger, and which of the two ran first depended on which
   * component happened to mount first. Mounted the wrong way round, the second
   * finger's press overwrote the selection this exists to put back — a defect
   * that would have appeared only on a phone, and only sometimes. Two listeners
   * is two orderings; one is none.
   *
   * Stable across renders, because it is a subscription. What changes with
   * every render is read from a ref instead.
   */
  const watch = useMemo(
    () => ({
      onFirstFinger: () => {
        const { documentId: id, selection: plugin } = latest.current
        before.current = plugin?.getState(id).selection ?? null
      },
      onBegin: (first: FirstFinger) => {
        tellTheToolItsPointerWasCancelled(first.target, first.pointerId)

        const { documentId: id, selection: plugin } = latest.current
        const remembered = before.current
        if (!plugin || remembered === null) {
          return
        }
        /*
         * Only what the pinch itself destroyed. If something is selected now, it
         * is either the same passage — in which case there is nothing to do — or
         * a newer one the reader made between the two fingers landing, and
         * putting the older one back would be this reader deciding it knew
         * better.
         */
        if (plugin.getState(id).selection !== null) {
          return
        }
        plugin.setSelection(remembered, id)
      },
    }),
    [],
  )

  usePinch(watch)
}
