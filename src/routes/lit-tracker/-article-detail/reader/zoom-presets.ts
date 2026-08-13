import type { ZoomLevel } from '@embedpdf/plugin-zoom'
import { ZoomMode } from '@embedpdf/plugin-zoom'

/**
 * The zoom levels the reader offers, and how a zoom is written down.
 *
 * Separated from the control that shows them because this is the part a test
 * can hold: the component renders a menu over a WebAssembly canvas, and the
 * arithmetic below is what actually decides what a reader sees.
 */

export interface ZoomPreset {
  /** What the plugin is asked for. A mode adapts to the panel; a number does not. */
  level: ZoomLevel
  /** What the menu says. */
  label: string
}

/**
 * The two fitting modes first, then fixed magnifications.
 *
 * The modes lead because they are the ones worth choosing on purpose — a paper
 * in a panel whose width changes with the sidebar wants "fit width" far more
 * often than it wants exactly 150%. The fixed steps stop at 400%: beyond that a
 * page is a few words wide, which is a magnifier's job rather than a reader's.
 */
export const ZOOM_PRESETS: readonly ZoomPreset[] = [
  { level: ZoomMode.FitWidth, label: 'fit width' },
  { level: ZoomMode.FitPage, label: 'fit page' },
  { level: 0.5, label: '50%' },
  { level: 0.75, label: '75%' },
  { level: 1, label: '100%' },
  { level: 1.5, label: '150%' },
  { level: 2, label: '200%' },
  { level: 4, label: '400%' },
]

/**
 * The zoom as the toolbar shows it.
 *
 * Always the **effective** scale, never the requested one: "fit width" is a
 * request, and what the reader is looking at is whatever percentage that worked
 * out to. Showing the mode's name here instead would leave the one number the
 * control exists to report missing exactly when it is least guessable.
 *
 * Rounded to whole percent because a paper at 123.7% and one at 124% are the
 * same paper, and a figure that changes by a decimal on every resize reads as
 * jitter.
 */
export function formatZoomPercent(scale: number): string {
  return `${Math.round(scale * 100)}%`
}
