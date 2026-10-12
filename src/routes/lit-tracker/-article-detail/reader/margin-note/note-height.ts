/**
 * How tall a margin note must be to show everything written in it
 * (features/a-passage-gets-a-margin-note, task 2).
 *
 * **A margin note cannot be resized by hand** — its place is its passage's — so
 * the reader has no way to uncover words that run past its box. The box
 * therefore follows the words: when editing ends it becomes exactly as tall as
 * the text, with one line as the least it can be.
 *
 * **Measured, not estimated.** The text is laid out by the browser, in the
 * engine's own editor, at the note's own width and font; that height is the
 * truth, and a character count would only approximate it. This converts the
 * measurement from screen pixels into the page points the annotation is stored
 * in, using the box's own width as the scale — the same element, measured the
 * same way, so zoom and any transform cancel out.
 */

/** The engine's editor sets its text at this line height (`plugin-annotation`). */
export const EDITOR_LINE_HEIGHT = 1.18

export interface Measured {
  /** The text's laid-out height, in CSS pixels. */
  textHeight: number
  /** The editor's width, in CSS pixels. */
  boxWidth: number
}

/** The note's height in page points, given its width and font size in points. */
export function fittedHeight(
  { textHeight, boxWidth }: Measured,
  noteWidth: number,
  fontSize: number,
): number {
  const oneLine = Math.ceil(fontSize * EDITOR_LINE_HEIGHT)
  if (boxWidth <= 0 || noteWidth <= 0) {
    return oneLine
  }
  const scale = boxWidth / noteWidth
  return Math.max(oneLine, Math.ceil(textHeight / scale))
}
