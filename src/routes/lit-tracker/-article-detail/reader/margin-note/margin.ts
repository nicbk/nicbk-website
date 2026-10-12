import type { Rect, Size } from '@embedpdf/models'

/**
 * Where a page's text is, and so where its margins are
 * (features/a-passage-gets-a-margin-note).
 *
 * **Measured from the page's own text runs**, which the engine reads straight
 * out of the PDF for any page of any paper, offline. GROBID knows paragraphs
 * too, but only for papers it has read, and a margin note has to work on every
 * page the reader can select text on.
 *
 * **Rectangles only, never font sizes.** A run's `fontSize` is not the size the
 * text is drawn at — one measured paper reports its body as 1pt, because the
 * size lives in the text matrix — but its rectangle is in page points whatever
 * the matrix says. That is all a margin needs.
 */

/** The horizontal extent of a page's text, in page points. */
export interface TextBlock {
  left: number
  right: number
}

/** A run as this module needs it: its text and where it is drawn. */
export interface RunLike {
  text: string
  rect: Rect
}

/**
 * Runs this short do not stretch the block.
 *
 * A page number, a footnote mark or a stray bullet can sit out in the margin by
 * itself; letting it define the text block would make a margin look as narrow
 * as the ornament is far out. Three characters keeps every word of body text
 * and drops those.
 */
const SHORTEST_RUN_THAT_COUNTS = 3

/** The text block across `runs`, or null when the page has no text to measure. */
export function textBlockOf(runs: readonly RunLike[]): TextBlock | null {
  const counted = runs.filter(
    (run) => run.text.trim().length >= SHORTEST_RUN_THAT_COUNTS,
  )
  if (counted.length === 0) {
    return null
  }
  return {
    left: Math.min(...counted.map((run) => run.rect.origin.x)),
    right: Math.max(
      ...counted.map((run) => run.rect.origin.x + run.rect.size.width),
    ),
  }
}

export type MarginSide = 'left' | 'right'

/**
 * The margin nearer the passage: the side of the text block's centre that the
 * passage's own centre is on.
 *
 * On a two-column paper this sends the left column's notes left and the right
 * column's right, which is where a reader writing by hand would put them.
 */
export function nearerMargin(block: TextBlock, passage: Rect): MarginSide {
  const blockCentre = (block.left + block.right) / 2
  const passageCentre = passage.origin.x + passage.size.width / 2
  return passageCentre < blockCentre ? 'left' : 'right'
}

/** How wide the margin on `side` is, from the page's edge to the text. */
export function marginWidth(
  block: TextBlock,
  page: Size,
  side: MarginSide,
): number {
  return side === 'left' ? block.left : page.width - block.right
}
