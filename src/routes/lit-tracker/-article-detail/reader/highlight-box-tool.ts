import type { PdfAnnotationObject } from '@embedpdf/models'
import { PdfAnnotationSubtype, PdfBlendMode } from '@embedpdf/models'
import type { AnnotationTool } from '@embedpdf/plugin-annotation'

/**
 * The highlight box: a rectangle the paper stays readable through.
 *
 * A distinct tool rather than a colour option on the rectangle task 4 shipped —
 * which is also what keeps the deferred colour picker deferred
 * (research/ui-ux/pages/lit-tracker/components/reader-annotation.md, 2026-08-17).
 *
 * **Translucency by blend mode, not by alpha.** A half-opaque fill over text
 * fades the text with it; multiplying leaves black glyphs black and tints only
 * the white around them, which is how a real highlighter behaves and how
 * EmbedPDF's own `inkHighlighter` is built. That tool is the precedent this one
 * follows in every respect, including how it tells itself apart from the plain
 * variant of its own subtype.
 *
 * **`intent` is the mark's identity, and it has to be, because the subtype is
 * not.** A highlight box is stored as a `square` like any other rectangle, so
 * without a second field the sidebar would call it "rectangle" after a reload
 * and selecting it would offer the opaque tool. `intent` is a base annotation
 * field, so it survives the payload round-trip with no schema change — the
 * `annotations` table already carries whatever the engine puts on the object.
 */

/** The engine tool id, as `setActiveTool` takes it. */
export const HIGHLIGHT_BOX_TOOL_ID = 'highlightBox'

/**
 * What marks a square as this tool's rather than the plain rectangle's.
 *
 * Spelled in the PDF's own style, matching `InkHighlight`, because it is written
 * into an annotation object and would be readable by any other PDF tool.
 */
export const HIGHLIGHT_BOX_INTENT = 'SquareHighlight'

/**
 * The yellow every highlighter in this reader uses — EmbedPDF's own highlight
 * colour, borrowed so the two see-through marks match rather than nearly match.
 */
const HIGHLIGHT_BOX_COLOR = '#FFCD45'

/**
 * The tool, built from the engine's resolved `square`.
 *
 * **Cloned rather than declared.** A tool needs a `pointerHandler` — the thing
 * that turns a drag into a rectangle — and the installed plugin does not export
 * `squareHandlerFactory`. A brand-new id in the plugin's `tools` config is added
 * as-is rather than inheriting from a built-in (the plugin merges by id, and an
 * unmatched id gets no base), so declaring this in `reader-plugins.ts` beside
 * the others would produce a tool that activates and then does nothing on drag.
 * Taking the resolved `square` and replacing what differs reuses the engine's
 * own creation, transform and hit-testing code, and cannot drift from it.
 *
 * The caller supplies the base because only a mounted plugin can resolve it;
 * this stays a pure function so the interesting part — what differs from a plain
 * rectangle — is assertable without an engine.
 */
export function highlightBoxToolFrom(
  square: AnnotationTool<PdfAnnotationObject>,
): AnnotationTool<PdfAnnotationObject> {
  return {
    ...square,
    id: HIGHLIGHT_BOX_TOOL_ID,
    name: 'Highlight Box',
    /*
     * Scored above the plain square's 1 so a stored highlight box resolves to
     * this tool rather than to the one it was cloned from. Both match a SQUARE;
     * this one additionally matches the intent, and the more specific match has
     * to win — the same relationship `inkHighlighter` has with `ink`, and the
     * same 10 it uses to win it.
     */
    matchScore: (annotation) =>
      annotation.type === PdfAnnotationSubtype.SQUARE &&
      annotation.intent === HIGHLIGHT_BOX_INTENT
        ? 10
        : 0,
    defaults: {
      ...square.defaults,
      type: PdfAnnotationSubtype.SQUARE,
      intent: HIGHLIGHT_BOX_INTENT,
      // The fill is the mark. The plain rectangle is a stroke around nothing
      // (`color: 'transparent'`), which is what makes it useful for circling a
      // figure and useless for shading one.
      color: HIGHLIGHT_BOX_COLOR,
      opacity: 1,
      blendMode: PdfBlendMode.Multiply,
      /*
       * No outline: a border would read as a box drawn *around* the passage
       * rather than over it, and it is the one part of the plain rectangle this
       * tool exists to replace.
       *
       * **A zero width, not a transparent colour**, and the difference is not
       * cosmetic. The engine treats the two colour slots on a shape quite
       * differently: the interior has an explicit `'transparent'` branch that
       * clears it, and the stroke has none — it goes straight to a hex parser
       * that *throws* on anything else. That throw happens inside the commit
       * task, where nothing surfaces it: the mark drew perfectly, the commit
       * failed, no committed event was emitted, and so the sync bridge never
       * saw a creation to write. A highlight box that looked right and vanished
       * on reload (found in the browser). The colour below is therefore a real
       * one, and invisible only because it is nought pixels wide.
       */
      strokeWidth: 0,
      strokeColor: HIGHLIGHT_BOX_COLOR,
    },
  }
}
