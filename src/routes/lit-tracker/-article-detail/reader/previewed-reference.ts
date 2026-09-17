import type { Rect } from '@embedpdf/models'
import type { Box, EntryRegion } from '~/lit-tracker/extraction/tei/regions'
import type { PreviewRegion } from './link-preview-region'

/**
 * Which reference the preview is showing (features/a-citation-opens-the-paper,
 * task 2).
 *
 * #22's `previewRegion` says *where on the page* a link lands; task 1 stored
 * *where each reference is printed*, as GROBID located it. Both are page points
 * with a top-left origin, measured against each other on a real paper before
 * this was written. This puts the two together: given the region and the open
 * paper's edges, which edge — if any — the reader is looking at.
 *
 * Pure, and matched on geometry alone: never on the reference's printed number,
 * which a publisher PDF gets wrong, and never on its text, which comes out
 * broken on exactly those papers.
 */

/**
 * How much of an entry has to lie inside the region for it to be the one shown.
 *
 * The region is not a copy of the entry's rectangle — it starts a little above,
 * because #22 snaps to a text run whose rect carries the line's ascent while
 * GROBID's boxes are tight to the glyphs — so it dips into whatever is printed
 * above. Measured over the 343 located references in the local collection
 * (BERT, RoBERTa, Attention, ConvS2S, Layer Normalization):
 *
 * | | coverage |
 * |---|---|
 * | the entry the region is showing | **1.000**, every one |
 * | the entry printed above it, worst case | **0.406** (a one-line entry in Layer Normalization) |
 * | any other entry on the page | below 0.19 |
 *
 * So a half is a wide gap rather than a fine line, and an overlap that is only
 * a clipped line above cannot be mistaken for the entry itself.
 */
const MIN_COVERAGE = 0.5

/** An edge as this needs it: where its entry is printed, or nothing. */
export interface LocatedEdge {
  entryRegions: EntryRegion | null
}

/**
 * The one edge the region is showing, or `null`.
 *
 * **One edge or none.** A region covering two entries — a link landing between
 * them, a bibliography set tighter than any measured here — resolves to
 * neither: offering nothing costs a reader a click, and opening the wrong paper
 * costs them their place and their trust in the one that was right.
 *
 * The edge comes back as it was passed in, so the caller keeps whatever it
 * carries: the article at the other end, its title, whether it is in the
 * collection at all.
 */
export function previewedReference<E extends LocatedEdge>(
  region: PreviewRegion | null,
  edges: readonly E[],
): E | null {
  if (!region) {
    return null
  }

  let found: E | null = null
  for (const edge of edges) {
    const entry = edge.entryRegions
    // A page of its own first: a rectangle says nothing without one. The same
    // rectangle on the page before the one measured covers a *different*
    // reference, to 0.998 — two pages of one bibliography are set alike.
    if (!entry || entry.pageIndex !== region.pageIndex) {
      continue
    }
    if (coverage(entry, region.rect) < MIN_COVERAGE) {
      continue
    }
    if (found) {
      return null
    }
    found = edge
  }
  return found
}

/** How much of the entry's printed area lies inside the rectangle, 0 to 1. */
function coverage(entry: EntryRegion, rect: Rect): number {
  let printed = 0
  let inside = 0
  for (const box of entry.boxes) {
    printed += box.width * box.height
    inside += overlap(box, rect)
  }
  return printed > 0 ? inside / printed : 0
}

/** The area of a box that lies inside a rectangle. */
function overlap(box: Box, rect: Rect): number {
  const width =
    Math.min(box.x + box.width, rect.origin.x + rect.size.width) -
    Math.max(box.x, rect.origin.x)
  const height =
    Math.min(box.y + box.height, rect.origin.y + rect.size.height) -
    Math.max(box.y, rect.origin.y)
  return width > 0 && height > 0 ? width * height : 0
}
