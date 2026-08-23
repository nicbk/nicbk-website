import type { Position } from '@embedpdf/models'

/**
 * What the magnifier shows, and where it sits.
 *
 * **Why there is a magnifier at all.** Extending a selection is
 * character-precise, as it is on a phone, and a thumb covers roughly three
 * characters of body text — including, always, the one it is aiming at. Every
 * platform answers this the same way: show the reader what their finger is on,
 * somewhere their finger is not.
 *
 * The arithmetic lives here, apart from the canvas that paints it, because
 * *where* the lens looks and *where* it sits are decisions that can be wrong in
 * ways a browser pass would only notice as "it feels off".
 */

/** How much larger the paper appears inside the lens. */
export const MAGNIFICATION = 2

/** The lens, in CSS pixels. Wide rather than round: a line of text has context to either side. */
export const MAGNIFIER_SIZE = { width: 168, height: 56 }

/** How far the lens floats from the finger, in CSS pixels. */
export const MAGNIFIER_GAP = 24

/** How close the lens may come to the edge of the reader's panel. */
const EDGE_MARGIN = 8

export interface SourceRect {
  x: number
  y: number
  width: number
  height: number
}

interface LensSubject {
  /** The point on the page the lens is centred on, in page coordinates. */
  boundary: Position
  /** The document's zoom: page units to CSS pixels. */
  scale: number
}

/**
 * The part of the page image the lens shows, in that image's own pixels.
 *
 * **In image pixels, not CSS ones**, because that is what `drawImage` takes as
 * its source rectangle — and because the page image is rendered at the device's
 * pixel ratio, which is what makes this a magnifier rather than an upscaler: at
 * 2× on a 3× screen the lens is still showing pixels that were rendered, not
 * invented.
 *
 * Not clamped to the image. A boundary near the edge of a page genuinely has
 * less than half a lens of paper beside it, and the canvas simply leaves that
 * part unpainted — which is the truth. Clamping would slide the view sideways
 * and put the caret somewhere other than the middle, which is worse: the reader
 * would be aiming at a boundary that had quietly moved.
 */
export function magnifierSource(
  { boundary, scale }: LensSubject,
  imagePixelsPerPageUnit: number,
): SourceRect {
  // The lens shows this much of the *displayed* page, in page units.
  const width = MAGNIFIER_SIZE.width / (MAGNIFICATION * scale)
  const height = MAGNIFIER_SIZE.height / (MAGNIFICATION * scale)

  return {
    x: (boundary.x - width / 2) * imagePixelsPerPageUnit,
    y: (boundary.y - height / 2) * imagePixelsPerPageUnit,
    width: width * imagePixelsPerPageUnit,
    height: height * imagePixelsPerPageUnit,
  }
}

/**
 * Where a point on the page falls inside the lens, in the lens's own CSS pixels.
 *
 * Used to draw over the magnified paper what is drawn over the real paper — the
 * selection, and the boundary being dragged — so the lens shows the decision
 * being made rather than just the words it is being made about.
 */
export function pointInMagnifier(
  point: Position,
  { boundary, scale }: LensSubject,
): Position {
  return {
    x:
      MAGNIFIER_SIZE.width / 2 + (point.x - boundary.x) * scale * MAGNIFICATION,
    y:
      MAGNIFIER_SIZE.height / 2 +
      (point.y - boundary.y) * scale * MAGNIFICATION,
  }
}

export interface MagnifierPlacement {
  /** Left edge, in client coordinates — the lens is positioned against the window. */
  left: number
  /** Top edge, likewise. */
  top: number
  /** True when there was no room above the finger and the lens went below it. */
  below: boolean
}

/** The reader's panel, in client coordinates. */
export interface PanelBounds {
  left: number
  top: number
  right: number
  /**
   * Not used by the lens, which flips above or below the finger and is never
   * held inside the panel vertically. It is here because the panel is one thing
   * and this is its fourth side: `drag/auto-scroll.ts` measures a finger against
   * both horizontal edges, and a second, three-sided description of the same
   * rectangle would be one to keep in step.
   */
  bottom: number
}

/**
 * Where the lens sits relative to the finger.
 *
 * Above it, because the point of the thing is to show what the finger covers;
 * below it when the finger is near the top of the panel and there is no room —
 * a lens clipped by the top of the reader shows the reader nothing at all.
 *
 * Held inside the panel horizontally, so dragging a handle to the margin does
 * not push half the lens off the screen. It is not held inside vertically for
 * the same reason it flips: the flip already answers that.
 */
export function magnifierPlacement(
  finger: Position,
  panel: PanelBounds,
): MagnifierPlacement {
  const above = finger.y - MAGNIFIER_GAP - MAGNIFIER_SIZE.height
  const below = above < panel.top + EDGE_MARGIN

  const leftmost = panel.left + EDGE_MARGIN
  const rightmost = panel.right - MAGNIFIER_SIZE.width - EDGE_MARGIN

  return {
    left: clamp(finger.x - MAGNIFIER_SIZE.width / 2, leftmost, rightmost),
    top: below ? finger.y + MAGNIFIER_GAP : above,
    below,
  }
}

function clamp(value: number, lowest: number, highest: number): number {
  // Lowest wins when the panel is narrower than the lens, which is not a real
  // reader width but is a real test and a real 320px phone in landscape.
  return Math.max(lowest, Math.min(value, highest))
}
