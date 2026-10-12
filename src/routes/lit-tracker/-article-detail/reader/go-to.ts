import { READER_TOOLBAR_ATTRIBUTE } from './menu-placement'

/**
 * Where the reader stops when it is sent to a point on a page.
 *
 * Shared by every jump that names a point rather than only a page: a citation
 * preview's **go to** (`citation-preview.tsx`) and a contents entry
 * (features/a-paper-shows-its-contents). Both want the point at the top of the
 * reader, and both found the same thing in the browser: the point's own top
 * lands under the reader's floating toolbar. One module keeps the two stopping
 * in the same place.
 */

/** Room left between the toolbar and the point a reader went to. */
const GO_TO_BREATHING_ROOM = 8

/**
 * The page top to scroll to, in page points, so that `top` sits just below the
 * toolbar: short by the toolbar's depth, converted from screen pixels to page
 * points at the reading zoom.
 */
export function topClearOfToolbar(
  top: number,
  toolbarClearancePx: number,
  scale: number,
): number {
  const clearance = (toolbarClearancePx + GO_TO_BREATHING_ROOM) / scale
  return Math.max(0, top - clearance)
}

/**
 * How far below the reader's top a jump puts its point, in screen pixels: the
 * line a point "at the top of the reader" is actually at. The contents list
 * marks the section whose heading has reached it (`reading-line.ts`), so the
 * entry a reader chose is the entry marked when the jump lands.
 */
export function jumpLanding(): number {
  return toolbarClearance() + GO_TO_BREATHING_ROOM
}

/** How far the toolbar reaches down into the reader, in screen pixels. */
export function toolbarClearance(): number {
  const bar = globalThis.document?.querySelector(
    `[${READER_TOOLBAR_ATTRIBUTE}]`,
  )
  const reader = bar?.parentElement
  if (!bar || !reader) {
    return 0
  }
  const groups = [...bar.children].map((child) => child.getBoundingClientRect())
  const bottom = groups.length
    ? Math.max(...groups.map((group) => group.bottom))
    : bar.getBoundingClientRect().bottom
  return Math.max(0, bottom - reader.getBoundingClientRect().top)
}
