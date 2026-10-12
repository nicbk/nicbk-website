import type { PdfBookmarkObject } from '@embedpdf/models'
import { destinationOf, targetTop } from '~/lit-tracker/pdf/destination'
import type { ContentsEntry } from './contents'

/**
 * A PDF's own outline (its bookmarks), as contents entries
 * (features/a-paper-shows-its-contents).
 *
 * **Flattened in reading order, with depth.** The outline is a tree; the list
 * the reader sees is the same tree read top to bottom, indented.
 *
 * **An entry that goes nowhere is dropped.** Some outlines point at actions
 * other than a page — measured on one test file, every entry did — and a
 * contents entry that cannot be followed is not one. Its children are kept: a
 * part that is only a heading can still hold chapters that go somewhere, so
 * they are lifted to its depth.
 *
 * **The position comes from the destination**, converted to page points from
 * the top by the same function the link preview uses (`pdf/destination.ts`).
 * A destination that names only a page has no position, and the reader goes to
 * the page's top.
 */
export function outlineEntries(
  bookmarks: readonly PdfBookmarkObject[],
  pageHeights: readonly number[],
): ContentsEntry[] {
  const entries: ContentsEntry[] = []

  function walk(level: readonly PdfBookmarkObject[], depth: number): void {
    for (const bookmark of level) {
      const destination = destinationOf(bookmark.target)
      const height = destination
        ? pageHeights[destination.pageIndex]
        : undefined
      const title = bookmark.title.trim()
      const placed =
        destination !== null && height !== undefined && title !== ''
      if (placed) {
        const { x, y } = targetTop(destination, { height })
        entries.push({
          title,
          depth,
          pageIndex: destination.pageIndex,
          // `targetTop` answers (0, 0) for a destination with no position.
          top: x === 0 && y === 0 ? null : y,
        })
      }
      walk(bookmark.children ?? [], placed ? depth + 1 : depth)
    }
  }

  walk(bookmarks, 1)
  return entries
}

/**
 * The fewest entries an outline must have to count as the paper's contents.
 *
 * A real review article measured for this feature carries an outline of one
 * entry, named after the HTML file it was converted from — the converter's
 * artefact, not the paper's structure. One entry is not a table of contents;
 * two can be (a short paper's two parts), and anything below falls back to the
 * paper's headings.
 */
export const SMALLEST_USABLE_OUTLINE = 2

/** Whether the outline is usable as the paper's contents. */
export function isUsableOutline(entries: readonly ContentsEntry[]): boolean {
  return entries.length >= SMALLEST_USABLE_OUTLINE
}
