import type {
  PdfAnnotationObject,
  PdfFreeTextAnnoObject,
} from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'
import type { AnnotationTool } from '@embedpdf/plugin-annotation'

/**
 * The text box, sized for a margin (features/a-note-fits-the-margin).
 *
 * **The engine's default is bigger than the paper it is written on.** EmbedPDF
 * gives `freeText` 14pt text in a box it sizes 100 × 20pt on a click. Measured
 * through GROBID's paragraph coordinates on the papers in the collection:
 *
 * | paper | style | left margin | body text |
 * |---|---|---|---|
 * | Attention Is All You Need | NeurIPS | 108pt | 8.6pt |
 * | RoBERTa | ACL | 72pt | 9.8pt |
 *
 * So the text was 1.4–1.6× the size of the text it annotates, and the box was
 * wider than a one-inch margin before a character was typed.
 */

/**
 * 8pt: smaller than the 8.6–9.8pt these papers set their body in, which is what
 * makes a note read as the reader's own hand rather than as part of the paper.
 * About eighteen characters to a line in the narrow margin (user-decided
 * 2026-09-16, from the measured sizes and their characters-per-line).
 */
export const MARGIN_FONT_SIZE = 8

/**
 * 72pt wide — one inch, the narrower of the two margins measured, and therefore
 * the one that has to fit. A box that fits an ACL paper's margin fits a
 * NeurIPS paper's 108pt with room to spare.
 */
export const MARGIN_BOX_WIDTH = 72

/**
 * 40pt tall, which is four lines of 8pt text.
 *
 * **The box does not grow with what is typed into it.** The editor draws the
 * text in a span of exactly the annotation's height with `overflow: hidden` and
 * `line-height: 1.18`, and the plugin's `freeText` transform handles only move,
 * resize and rotate — so anything past the box's height is invisible until the
 * reader resizes it. The engine's own 20pt held 1.2 lines of its 14pt text,
 * which is why a note there is a few words. A margin has vertical room to
 * spare, so this default holds a sentence: 4 × 8 × 1.18 = 37.8pt, rounded up.
 */
export const MARGIN_BOX_HEIGHT = 40

/**
 * The tool, from the engine's own resolved `freeText`.
 *
 * **Cloned rather than re-declared**, for the reason `highlight-box-tool.ts`
 * gives and one more of its own. The plugin merges a `tools` override by id
 * with the override's **top-level fields replacing** the base's — recorded in
 * `link-annotations.ts` — so a static `{ defaults: { fontSize: 8 } }` would not
 * add a size to the defaults, it would *become* them, dropping the red, the
 * font, the alignment and the subtype in one go. Spreading the resolved tool's
 * own defaults changes the two numbers that are a decision here and leaves
 * everything else exactly as the engine chose it.
 *
 * A pure function so what differs — and only what differs — is assertable
 * without a mounted plugin; `use-margin-text-box.ts` is the lifecycle half.
 */
export function marginTextBoxFrom(freeText: ResolvedTool): ResolvedTool {
  return {
    ...freeText,
    defaults: {
      ...textBoxDefaults(freeText),
      // Stated rather than inherited, so the object is unambiguously a text
      // box's to the compiler as well as to a reader.
      type: PdfAnnotationSubtype.FREETEXT,
      fontSize: MARGIN_FONT_SIZE,
    },
    clickBehavior: {
      ...freeText.clickBehavior,
      enabled: freeText.clickBehavior?.enabled ?? true,
      defaultSize: {
        width: MARGIN_BOX_WIDTH,
        height: MARGIN_BOX_HEIGHT,
      },
    },
  }
}

/**
 * A resolved tool, as the mounted plugin hands it over.
 *
 * Broad, like `highlightBoxToolFrom`'s parameter and for the same reason: the
 * capability this project holds is not parameterised by its tool list, so
 * `getTool('freeText')` is typed as any tool rather than as the text box's. The
 * two readers below are where that is turned back into the text box's own
 * fields, in one place with the reason attached.
 */
export type ResolvedTool = AnnotationTool<PdfAnnotationObject>

/** A text box tool's defaults — the subtype the id belongs to. */
function textBoxDefaults(tool: ResolvedTool): Partial<PdfFreeTextAnnoObject> {
  return tool.defaults as Partial<PdfFreeTextAnnoObject>
}

/** The size a click gives a new box, when the tool creates one on click. */
function clickSize(
  tool: ResolvedTool,
): { width: number; height: number } | undefined {
  return (
    tool.clickBehavior as
      | { defaultSize?: { width: number; height: number } }
      | undefined
  )?.defaultSize
}

/** Whether the engine is already holding the margin-sized version. */
export function isMarginSized(tool: ResolvedTool): boolean {
  return (
    textBoxDefaults(tool).fontSize === MARGIN_FONT_SIZE &&
    clickSize(tool)?.width === MARGIN_BOX_WIDTH
  )
}
