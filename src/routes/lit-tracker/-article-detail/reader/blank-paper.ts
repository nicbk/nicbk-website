/**
 * Whether a press landed on the bare paper rather than on anything drawn over
 * it.
 *
 * This is how the reader knows to put a selected mark down: clicking away from
 * something is the universal way of deselecting it, and EmbedPDF does not do it
 * for us — the selection plugin emits an "empty space" event, but it means "no
 * *text* here", and the annotation plugin does not listen to it at all. So a
 * selected mark stayed selected, with its delete control floating over the page,
 * until another mark was chosen.
 *
 * **The test is an attribute on the page image, not its type or its class.** The
 * rendered page is an `<img>`, but so is an annotation that carries its own
 * appearance stream, so `instanceof HTMLImageElement` would treat clicking a
 * stamp-like mark as clicking the paper — deselecting the very thing that was
 * just pressed. A CSS-module class would work and would tie this to a
 * stylesheet's hashed name. The attribute is set exactly once, on the render
 * layer, and says what it is for.
 */

/** Marks the rendered page itself. Set in `pdf-reader.tsx` on the render layer. */
export const PAPER_ATTRIBUTE = 'data-paper'

export function isBlankPaper(target: EventTarget | null): boolean {
  return target instanceof Element && target.hasAttribute(PAPER_ATTRIBUTE)
}
