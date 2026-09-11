import { uuidV4 } from '@embedpdf/models'
import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import type { SelectionCapability } from '@embedpdf/plugin-selection'
import { marksFor } from './markup-marks'

/**
 * Marking the selected passage with a text tool, and clearing the selection
 * afterwards.
 *
 * **One commit path, two callers.** The gesture that finishes a selection the
 * library left open (`use-finish-selection.ts`) and the action a reader chooses
 * from the selection's own menu (`selection-menu.tsx`) mark a passage the same
 * way, because they are the same act. A second implementation would be a second
 * set of marks to keep in step with the library's.
 *
 * **The clear is the library's own ending, not an extra.** EmbedPDF's markup
 * handler finishes with `selection.clear()`
 * (`plugin-annotation/dist/index.js:4809`), which is why marking with a tool on
 * one page leaves nothing selected today. Doing the same keeps the paths
 * indistinguishable to the reader — and clearing resets the plugin's `selecting`
 * flag as a side effect, which is why the caller that is repairing that flag has
 * nothing more to do on this branch.
 *
 * **The text is fetched first, because the mark quotes it.** A document that
 * withholds permission to extract text still gets its mark; it simply quotes
 * nothing. The passage is worth highlighting either way, and the sidebar falls
 * back to the tool's name (`reader-annotation.md`, 2026-08-16).
 */

/**
 * The part of the annotation scope marking needs.
 *
 * Named structurally rather than taken as the whole capability so the unit tier
 * can hand it one function instead of standing up a plugin registry.
 */
export interface MarkingTools {
  createAnnotation: (pageIndex: number, annotation: never) => void
}

export interface MarkSelection {
  /** The selection plugin: what is selected, and what clears it. */
  selection: SelectionCapability
  /** Where the marks go. */
  tools: MarkingTools | null
  /** The tool whose defaults the marks take. */
  tool: AnnotationTool
  documentId: string
}

/**
 * Marks what is currently selected, one mark per page it covers.
 *
 * Does nothing when the tool does not act on text, or when nothing is selected —
 * both are cheaper to check than to guard against at every call site.
 */
export function markSelection({
  selection,
  tools,
  tool,
  documentId,
}: MarkSelection): void {
  const formatted = selection.getFormattedSelection(documentId)
  if (!tools || formatted.length === 0) {
    return
  }

  const ids = formatted.map(() => uuidV4())
  const created = new Date()

  function create(text: string | undefined): void {
    for (const mark of marksFor({
      tool,
      selection: formatted,
      text,
      ids,
      created,
    })) {
      tools?.createAnnotation(mark.pageIndex, mark.annotation as never)
    }
    selection.clear(documentId)
  }

  selection.getSelectedText(documentId).wait(
    // Joined as the library joins it, so a mark made here quotes a passage the
    // same way a mark made by dragging the tool does.
    (lines) => create(lines.join('\n')),
    () => create(undefined),
  )
}
