/**
 * Where something GROBID parsed sits on the page
 * (features/a-citation-opens-the-paper).
 *
 * GROBID emits a `coords` attribute when the request asks for
 * `teiCoordinates=<element>`: a semicolon-separated list of
 * `page,x,y,width,height`, in **PDF points with the origin at the upper left
 * and y increasing downward**, one box per line the element spans
 * (https://grobid.readthedocs.io/en/latest/Coordinates-in-PDF/).
 *
 * A reference entry is therefore two to five boxes, one per printed line — kept
 * as they come rather than merged into a bounding box, because the union of a
 * hanging-indented entry's lines covers part of the entry above it.
 */

/** One box, in PDF points from the top-left of its page. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Where an entry sits: one page, and the boxes it occupies on it. */
export interface EntryRegion {
  /** **Zero-based**, converted from GROBID's one-based page number. */
  pageIndex: number
  boxes: Box[]
}

/**
 * Reads a `coords` attribute.
 *
 * Returns `null` for an absent, malformed or empty value — a paper GROBID could
 * not locate is not a failure, it is a bibliography written the way it was
 * before this existed.
 *
 * **Boxes on a second page are dropped, not kept.** An entry that straddles a
 * page break has its first page's boxes; the alternative is a region with two
 * pages in it, which nothing downstream could match against a preview that
 * shows one page.
 */
export function parseRegion(coords: string | undefined): EntryRegion | null {
  if (!coords) {
    return null
  }

  const boxes: Box[] = []
  let pageIndex: number | null = null

  for (const part of coords.split(';')) {
    const numbers = part.split(',').map((value) => Number(value.trim()))
    if (
      numbers.length !== 5 ||
      numbers.some((value) => !Number.isFinite(value))
    ) {
      continue
    }
    const [page, x, y, width, height] = numbers as [
      number,
      number,
      number,
      number,
      number,
    ]
    if (page < 1 || width <= 0 || height <= 0) {
      continue
    }
    const index = page - 1
    if (pageIndex === null) {
      pageIndex = index
    }
    if (index !== pageIndex) {
      continue
    }
    boxes.push({ x, y, width, height })
  }

  if (pageIndex === null || boxes.length === 0) {
    return null
  }
  return { pageIndex, boxes }
}
