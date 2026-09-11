import type { SelectionRangeX } from '@embedpdf/plugin-selection'

/**
 * Whether the library has left a selection unfinished.
 *
 * **The defect this answers.** EmbedPDF's text handler is registered *per page*
 * and keeps `dragStarted` in that page's own closure; its `onPointerUp` calls
 * `onEnd` only if that flag is set (`plugin-selection/dist/index.js:503-570`).
 * A drag that starts on one page and is released over the next therefore ends
 * nowhere: the page holding the flag never sees the lift, and the page that
 * sees the lift never had the flag. `endSelection` is never called, and two
 * things that depend on it silently do not happen — a live markup tool never
 * commits (`plugin-annotation/dist/index.js:4784` listens to `onEndSelection`),
 * and the floating control never appears, because the plugin suppresses its
 * placement while `selecting` is true (`plugin-selection:1065`).
 *
 * **Asked of the library, not inferred from the gesture.** `selecting` is part
 * of the public document state, so this reader can read what the plugin
 * believes rather than deducing it from which page a pointer went down on —
 * a mechanism that could change under us, and one this project has already been
 * caught reasoning about three times in #12.
 *
 * A pure predicate on purpose: it is the whole decision, and it is the one
 * thing here that can be wrong in a way no browser pass would show clearly.
 */

/** What the selection plugin reports about a document, as far as this matters. */
export interface SelectionSnapshot {
  /** True while the plugin believes a drag is still in progress. */
  selecting: boolean
  /** What is selected, or null. */
  selection: SelectionRangeX | null
}

/**
 * True when there is a selection the library thinks is still being made.
 *
 * Both halves are necessary. `selecting` alone is true in the middle of an
 * ordinary drag, which must be left alone; a selection alone is the usual,
 * healthy state and must not be re-finished on every pointer event that
 * happens to pass by.
 */
export function isUnfinished(snapshot: SelectionSnapshot): boolean {
  return snapshot.selecting && snapshot.selection !== null
}
