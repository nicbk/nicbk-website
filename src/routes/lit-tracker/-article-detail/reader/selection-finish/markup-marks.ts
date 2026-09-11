import type { PdfAnnotationObject } from '@embedpdf/models'
import type { AnnotationTool } from '@embedpdf/plugin-annotation'
import type { FormattedSelection } from '@embedpdf/plugin-selection'

/**
 * The marks a text tool makes of a selected passage.
 *
 * **One per page, which is the library's own shape.** EmbedPDF's
 * `textMarkupSelectionHandler` creates an annotation per entry of the formatted
 * selection, and the plugin formats one entry per page the passage covers
 * (`plugin-annotation/dist/index.js:3503-3525`). A passage crossing a break is
 * therefore two marks, each bounding its own page's part — not one mark with a
 * rectangle spanning the gap, which is not a thing a PDF can hold.
 *
 * **This is the twenty lines the feature's research decided to duplicate.** The
 * library will not run its own handler for a selection it never considered
 * finished, and its commit path is private. Rewriting the whole markup pipeline
 * was never the alternative — what is rebuilt here is only the shape of the
 * annotation, and it is pinned to the tool's own `defaults` so it cannot drift
 * from the library on colour, opacity or flags. Everything after this — the
 * engine's create, the commit, the row, the sidebar entry — is the path every
 * other mark in this reader already takes.
 *
 * Pure, and given the pieces rather than the capabilities, so what it builds can
 * be asserted against a real tool definition without an engine.
 */

/** A mark to create: which page it belongs to, and what it is. */
export interface PlannedMark {
  pageIndex: number
  annotation: PdfAnnotationObject
}

export interface MarkupPlan {
  /** The tool doing the marking — its defaults are the mark's shape. */
  tool: AnnotationTool
  /** The selection, formatted by the plugin: one entry per page. */
  selection: FormattedSelection[]
  /** The selected text, for the mark to quote. Absent when it could not be read. */
  text?: string | undefined
  /**
   * Ids for the marks, one per entry, supplied rather than generated.
   *
   * The caller holds the id generator this project already uses, and a pure
   * function that invented ids could not be asserted against an expected value.
   */
  ids: string[]
  /** When the marks were made. Passed in for the same reason the ids are. */
  created: Date
}

/**
 * What to create for `plan`, in page order.
 *
 * Empty when the tool does not act on text — a drawing tool has no business
 * marking a passage, and asking is cheaper than trusting the caller.
 */
export function marksFor({
  tool,
  selection,
  text,
  ids,
  created,
}: MarkupPlan): PlannedMark[] {
  if (!tool.interaction.textSelection) {
    return []
  }

  return selection.flatMap((onPage, index) => {
    const id = ids[index]
    if (id === undefined) {
      return []
    }

    return [
      {
        pageIndex: onPage.pageIndex,
        annotation: {
          ...tool.defaults,
          id,
          pageIndex: onPage.pageIndex,
          rect: onPage.rect,
          segmentRects: onPage.segmentRects,
          created,
          // The quoted passage, which is what the sidebar's list shows in place
          // of a tool's name (`reader-annotation.md`, 2026-08-16). Omitted
          // rather than empty when the text could not be read, so a mark never
          // claims to quote nothing.
          ...(text !== undefined && { custom: { text } }),
        } as PdfAnnotationObject,
      },
    ]
  })
}
