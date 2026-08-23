import type { PanelBounds } from '../magnifier-view'

/**
 * How fast the paper moves under a finger held at the edge of the reader.
 *
 * **Why the paper has to move at all.** A selection is extended by dragging a
 * handle, and a handle can only be dragged as far as the panel is tall. Without
 * this, a passage that runs off the bottom of the screen cannot be selected by
 * touch at all — the reader would have to let go, scroll, and start again, which
 * loses the selection they were adjusting.
 *
 * **The curve is the whole decision here**, which is why it is a function of one
 * number and lives apart from the loop that calls it. Settled with the user on
 * 2026-08-23 against the case that actually matters — extending a selection by
 * two or three lines, not sprinting down a page:
 *
 * - **A dead band.** Nothing moves until the finger is within `AUTO_SCROLL_BAND`
 *   of the edge. A reader adjusting a boundary near the bottom of the screen is
 *   not asking to scroll, and a panel that crept whenever a thumb came near its
 *   edge would be unusable.
 * - **Squared, not linear.** A straight ramp is already doing ~330 px/s a third
 *   of the way into the band — twenty lines a second, when the reader wanted
 *   three. Squaring keeps the near two-thirds of the band at reading speed and
 *   spends the last third getting up to travelling speed.
 * - **A ceiling, reached at the panel's edge.** Past the edge there is nowhere
 *   further to go — a finger can leave the panel entirely — so the rate stops
 *   climbing rather than running away with the paper.
 */

/** How close to the panel's edge a finger must be before the paper moves, in CSS pixels. */
export const AUTO_SCROLL_BAND = 56

/** The fastest the paper moves, in CSS pixels per second: about a page a second. */
export const AUTO_SCROLL_CEILING = 1000

/**
 * The paper's speed for a finger at `fingerY`, in CSS pixels per second.
 *
 * Negative to scroll up — towards the start of the document — and positive to
 * scroll down, matching the sign of the scroll offset it is added to. Zero
 * everywhere in the middle of the panel, which is almost always.
 *
 * Only the vertical axis, because this reader's scroll strategy is vertical
 * (`reader-plugins.ts`): a horizontal band would be a rate with nothing to
 * drive.
 */
export function autoScrollRate(fingerY: number, panel: PanelBounds): number {
  const aboveTop = panel.top + AUTO_SCROLL_BAND - fingerY
  if (aboveTop > 0) {
    return -rampedRate(aboveTop)
  }

  const belowBottom = fingerY - (panel.bottom - AUTO_SCROLL_BAND)
  if (belowBottom > 0) {
    return rampedRate(belowBottom)
  }

  return 0
}

/**
 * The curve itself: `ceiling × (into / band)²`, held at the ceiling once the
 * finger is at or past the panel's edge.
 */
function rampedRate(intoBand: number): number {
  const share = Math.min(intoBand / AUTO_SCROLL_BAND, 1)
  return AUTO_SCROLL_CEILING * share * share
}

/**
 * Where `rate` moves a scroll offset over `elapsed` milliseconds, kept inside
 * the document.
 *
 * The clamp is not a detail: without it a finger parked at the bottom edge of
 * the last page would drive the offset past the end of the paper for as long as
 * it stayed there, and every frame after would be spent scrolling back.
 */
export function nextScrollOffset({
  from,
  rate,
  elapsed,
  furthest,
}: {
  /** The current scroll offset, in CSS pixels. */
  from: number
  /** Pixels per second, as `autoScrollRate` returns them. */
  rate: number
  /** Milliseconds since the last frame. */
  elapsed: number
  /** The largest offset the document has: its height less the panel's. */
  furthest: number
}): number {
  const moved = from + (rate * elapsed) / 1000
  return Math.max(0, Math.min(moved, Math.max(furthest, 0)))
}
