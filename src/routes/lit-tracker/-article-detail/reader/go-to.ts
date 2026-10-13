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
 * The point on the page to scroll to the reader's top, in page points, so that
 * `top` sits just below the toolbar: short by the toolbar's depth, converted
 * from screen pixels to page points at the reading zoom.
 *
 * **It may be negative**: above the page, in the gap and the page before it.
 * It was clamped to the page's top at first, and on a phone that put headings
 * under the toolbar — measured at 375px, the two-row toolbar at 55% zoom is
 * 169pt deep, so a heading 78pt down its page was sent to the page's top and
 * landed 38px behind the controls. The scroller places a point linearly from
 * the page's origin, so a negative one is simply further up the paper, and the
 * viewport itself stops at the top of the first page.
 */
export function topClearOfToolbar(
  top: number,
  toolbarClearancePx: number,
  scale: number,
): number {
  const clearance = (toolbarClearancePx + GO_TO_BREATHING_ROOM) / scale
  return top - clearance
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
