import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { useEffect, useRef } from 'react'
import type { MarkingTools } from './mark-selection'
import { markSelection } from './mark-selection'
import type { SelectionSnapshot } from './unfinished-selection'
import { isUnfinished } from './unfinished-selection'

/**
 * Finishing a selection the library left open.
 *
 * `unfinished-selection.ts` explains the defect and holds the decision; this is
 * the part that acts on it, once for the document:
 *
 * - **With a text tool live, it marks the passage** and clears the selection —
 *   which is exactly what EmbedPDF's own handler does when it gets the
 *   end-of-selection event it never receives here.
 * - **With no tool live, it re-applies the same range.** That is not a no-op:
 *   `applySelection` dispatches `END_SELECTION`, so the stuck flag clears and
 *   the floating control that was suppressed while it was set appears
 *   (`plugin-selection/dist/index.js:1240-1286`, reducer at `:125-129`).
 *
 * **At the window, and on the bubble phase — the opposite of everything else in
 * this reader.** The pinch guard, the hold and the drag all listen on capture to
 * get *ahead* of the library. This one has to run *after* it: the question it
 * asks is whether the library finished the selection, and asking before the
 * library's own page listener has had the pointer-up would answer "no" for every
 * ordinary drag and finish selections that were about to finish themselves. The
 * library binds its listeners to the page element and never stops the native
 * event (`plugin-interaction-manager/dist/react/index.js`), so the bubble to the
 * window is reliable.
 *
 * **No order between this and this project's own listeners has to hold**, which
 * is the answer `AGENTS.md` asks for rather than a coincidence: the decision is
 * read from the library's flag at the moment this runs, and acting on it clears
 * that flag, so a second listener arriving later finds nothing to do.
 */

interface FinishSelection {
  documentId: string
  selection: SelectionCapability | null
  /** What marks the passage, when a text tool is live. */
  annotations: LiveMarkingTools | null
}

/**
 * The part of the annotation scope this needs: `mark-selection.ts`'s, plus the
 * live tool — which only this caller asks about, because the menu's actions name
 * the tool they mean.
 */
export interface LiveMarkingTools extends MarkingTools {
  getActiveTool: () => AnnotationTool | null
}

export function useFinishSelection({
  documentId,
  selection,
  annotations,
}: FinishSelection): void {
  /*
   * Both capabilities arrive after the plugins register and can change identity
   * on any render; the listener below is installed once and must not be torn
   * down to pick them up. The same shape the reader's other pointer machinery
   * uses, for the same reason.
   */
  const latest = useRef({ documentId, selection, annotations })
  latest.current = { documentId, selection, annotations }

  useEffect(() => {
    function whenPointerLifted(): void {
      const {
        documentId: id,
        selection: plugin,
        annotations: tools,
      } = latest.current
      if (!plugin) {
        return
      }

      const snapshot = snapshotOf(plugin, id)
      if (!snapshot || !isUnfinished(snapshot)) {
        return
      }

      const tool = tools?.getActiveTool() ?? null
      if (tool?.interaction.textSelection) {
        // Marking clears the selection, and clearing resets the flag — so this
        // branch needs no re-apply of its own.
        markSelection({ selection: plugin, tools, tool, documentId: id })
        return
      }

      // Nothing to mark: put the same range back, which is what clears the flag
      // and brings the floating control with it.
      plugin.setSelection(snapshot.selection, id)
    }

    // Bubble, deliberately — see the note above. Passive: this never calls
    // `preventDefault`, and saying so keeps it off the browser's critical path.
    window.addEventListener('pointerup', whenPointerLifted, { passive: true })
    // A gesture the browser took away still leaves the library believing a drag
    // is in progress, and the reader looking at a selection with no menu.
    window.addEventListener('pointercancel', whenPointerLifted, {
      passive: true,
    })

    return () => {
      window.removeEventListener('pointerup', whenPointerLifted)
      window.removeEventListener('pointercancel', whenPointerLifted)
    }
  }, [])
}

/**
 * What the plugin currently believes, or null.
 *
 * **Guarded because `getState` throws** for a document it does not know — a
 * reader who closes a paper while a finger is still down would otherwise take
 * an exception on the way out.
 */
function snapshotOf(
  selection: SelectionCapability,
  documentId: string,
): SelectionSnapshot | null {
  try {
    const state = selection.getState(documentId)
    return { selecting: state.selecting, selection: state.selection }
  } catch {
    return null
  }
}
