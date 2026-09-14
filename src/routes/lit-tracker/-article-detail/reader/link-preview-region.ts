import type { PdfDestinationObject, Rect } from '@embedpdf/models'
import { PdfZoomMode } from '@embedpdf/models'

/**
 * Where a paper's internal link points, as a region worth previewing.
 *
 * Task 2 of #22. A pure function over numbers the engine already hands out — a
 * destination, and the text runs of the pages around it — so every rule below is
 * exercised without a PDF, and task 3's popover only has to render the answer.
 *
 * ## Why this is not simply "the destination"
 *
 * Measured over five papers with the reader's own engine (2026-09-14; the
 * feature's `research.md` has the tables):
 *
 * - **LaTeX papers point exactly.** `[13]` targets the top-left of reference 13.
 * - **Publisher PDFs do not.** A PLOS ONE paper's `[18]` lands on entry **13**,
 *   `[39]` on 34, `[9]` on the top of the page — so a preview of the target
 *   would confidently show the wrong reference. Snapping a numbered citation to
 *   the line that starts with its own label corrected all 49 measured.
 * - **The target is a point, not a box.** How far a reference extends is
 *   bounded by where the next one starts; on a two-column page, how wide it is
 *   is bounded by its column, not the page.
 *
 * All coordinates are page points with a **top-left** origin, as the engine
 * reports text runs. PDF destinations are bottom-left; `targetTop` converts
 * once.
 */

/** One run of text on a page, as `getPageTextRuns` reports it. */
export interface TextRun {
  text: string
  rect: Rect
}

/** A page's size and its text, in top-left page points. */
export interface PageText {
  width: number
  height: number
  runs: readonly TextRun[]
}

/** Where another link in the document lands, for bounding an entry's height. */
export interface LinkLanding {
  pageIndex: number
  x: number
  y: number
}

export interface PreviewRegionInput {
  /** The characters the clicked link covers — `18`, `[18]`, `Table 1`. */
  linkText: string
  destination: PdfDestinationObject
  /** A page's text, or `undefined` for an index outside the document. */
  pageText: (pageIndex: number) => PageText | undefined
  /** Where every internal link in the document lands. */
  landings: readonly LinkLanding[]
}

export interface PreviewRegion {
  pageIndex: number
  rect: Rect
}

/** Runs whose tops are this close are on one line. */
const LINE_TOLERANCE = 6
/**
 * How far left of the target a run may start and still be the target's line —
 * a hanging `[13]` label sits left of where the entry's text is targeted.
 */
const LEFT_SLACK = 25
/**
 * The widest gap inside one column's line. Runs split at font changes, not
 * words, so gaps inside a line are a few points; the narrowest column gutter
 * measured (BERT) is 12.
 */
const COLUMN_GAP = 8
/** Lines below the top examined to find the column's right edge. */
const COLUMN_PROBE_DEPTH = 40
/**
 * How far right of the target a line may start and still be in its column — a
 * hanging indent. The other column of a two-column page starts far beyond it.
 */
const HANGING_INDENT = 20
/** A vertical gap this many line pitches wide ends a block of text. */
const PARAGRAPH_GAP = 1.8
/** A line that opens a table's or figure's caption. */
const CAPTION = /^\s*(?:Table|Figure|Fig\.?)\s*\d/i
/** A landing this close in x is in the same column. */
const SAME_COLUMN = 30
/** Height when nothing below bounds the entry: the measured last-entry case. */
const FALLBACK_HEIGHT = 120
/** No region is taller than this, however far away the next entry is. */
const MAX_HEIGHT = 240
/** Never narrower than this, even for a line of one short run. */
const MIN_WIDTH = 100
/** Breathing room around the crop, so ascenders and a label are not clipped. */
const PADDING = 3
/**
 * A page with at least this many lines starting with numbered labels is a
 * numbered list — a reference list, in practice.
 */
const LIST_LABELS = 3

/**
 * The region to preview for a link, or `null` when there is nothing to show.
 *
 * In order:
 *
 * 1. **Snap a numbered citation** to the line starting with its own label, on
 *    the target page or one either side, nearest first — but only when the
 *    target is in a numbered list. See `snapToLabel`.
 * 2. Otherwise the **exact target**, or the top of its page when the file gives
 *    no position.
 * 3. **Column** from the runs on that line, never from halves of the page.
 * 4. **Height** to where the next entry starts in that column; failing that, a
 *    bounded fallback.
 * 5. **Clamp** to the page.
 */
export function previewRegion({
  linkText,
  destination,
  pageText,
  landings,
}: PreviewRegionInput): PreviewRegion | null {
  const exactPage = pageText(destination.pageIndex)
  if (!exactPage) {
    return null
  }

  const exact = targetTop(destination, exactPage)
  const snapped = snapToLabel({
    linkText,
    pageIndex: destination.pageIndex,
    exact,
    precise: destination.zoom.mode === PdfZoomMode.XYZ,
    pageText,
  })
  const pageIndex = snapped?.pageIndex ?? destination.pageIndex
  const page = snapped ? snapped.page : exactPage
  const top = snapped?.top ?? exact

  const column = columnAt(page, top)
  const bottom = entryBottom({
    page,
    pageIndex,
    top: top.y,
    column,
    number: snapped?.number ?? null,
    landings,
  })

  const x = clamp(column.left - PADDING, 0, page.width)
  const y = clamp(top.y - PADDING, 0, page.height)
  const right = clamp(column.right + PADDING, x, page.width)
  const lower = clamp(bottom, y, page.height)

  return {
    pageIndex,
    rect: {
      origin: { x, y },
      size: { width: right - x, height: lower - y },
    },
  }
}

/** A point on a page, top-left origin. */
interface Point {
  x: number
  y: number
}

/**
 * The destination's own point, converted to top-left page coordinates.
 *
 * XYZ carries `(x, y)`; FitRectangle carries its box in `view` as
 * `[left, bottom, right, top]`. Any other form — FitPage, FitHorizontal with no
 * parameters — gives only a page, so the region starts at its top.
 */
export function targetTop(
  destination: PdfDestinationObject,
  page: Pick<PageText, 'height'>,
): Point {
  const { zoom, view } = destination
  if (zoom.mode === PdfZoomMode.XYZ) {
    return { x: zoom.params.x, y: page.height - zoom.params.y }
  }
  if (zoom.mode === PdfZoomMode.FitRectangle && view.length === 4) {
    const [left = 0, , , top = page.height] = view
    return { x: left, y: page.height - top }
  }
  return { x: 0, y: 0 }
}

/** A citation's number, when the link's text is nothing but one. */
export function citationNumber(linkText: string): number | null {
  const match = linkText.trim().match(/^\[?(\d{1,3})\]?[,.;]?$/)
  return match?.[1] ? Number(match[1]) : null
}

/** The label a line starts with — `[13]` or `13.` — and its number. */
function labelOf(run: TextRun): number | null {
  const match = run.text.match(/^\s*(?:\[(\d{1,3})\]|(\d{1,3})\.)(?:\s|$)/)
  const digits = match?.[1] ?? match?.[2]
  return digits ? Number(digits) : null
}

interface Snapped {
  pageIndex: number
  page: PageText
  top: Point
  number: number
}

/**
 * The line starting with the link's own label, if the target is in a numbered
 * list.
 *
 * **Only in a numbered list.** A link covering just `1` is as likely to be
 * "Table 1" as reference 1, and a table page may well have some line starting
 * `1.`. So a snap needs evidence that the target is a list of numbered entries,
 * and how much depends on how far the file's target can be trusted:
 *
 * - **An exact target** (XYZ, which LaTeX writes) snaps only when its own line
 *   starts with a label. A "Table 4" on a page where the references begin
 *   lower down must stay on the table — measured on *Attention*.
 * - **An approximate target** (a rectangle, or no position, which publishers
 *   write) snaps whenever its page is a numbered list. Measured on PLOS ONE:
 *   half its citations land in the contributions block *above* the reference
 *   list, where no line starts with a label, and the snap is the only way to
 *   their entries.
 *
 * Nearest page first: the target, then the page before, then the page after;
 * on a page, the label nearest the target wins.
 */
function snapToLabel({
  linkText,
  pageIndex,
  exact,
  precise,
  pageText,
}: {
  linkText: string
  pageIndex: number
  exact: Point
  precise: boolean
  pageText: PreviewRegionInput['pageText']
}): Snapped | null {
  const number = citationNumber(linkText)
  const targetPage = pageText(pageIndex)
  if (number === null || !targetPage) {
    return null
  }

  const targetLineIsLabel = runsOnLine(targetPage, exact).some(
    (run) => labelOf(run) !== null,
  )
  const pageIsList =
    targetPage.runs.filter((run) => labelOf(run) !== null).length >= LIST_LABELS
  if (!(targetLineIsLabel || (!precise && pageIsList))) {
    return null
  }

  for (const index of [pageIndex, pageIndex - 1, pageIndex + 1]) {
    const page = pageText(index)
    if (!page) {
      continue
    }
    const nearest = page.runs
      .filter((run) => labelOf(run) === number)
      .sort(
        (a, b) =>
          Math.abs(a.rect.origin.y - exact.y) -
          Math.abs(b.rect.origin.y - exact.y),
      )[0]
    if (nearest) {
      return {
        pageIndex: index,
        page,
        top: { x: nearest.rect.origin.x, y: nearest.rect.origin.y },
        number,
      }
    }
  }
  return null
}

/** Runs on the line at `top` that reach the target or start right of it. */
function runsOnLine(page: PageText, top: Point): TextRun[] {
  return page.runs.filter(
    (run) =>
      Math.abs(run.rect.origin.y - top.y) <= LINE_TOLERANCE &&
      reachesTarget(run, top),
  )
}

/**
 * Whether a run belongs to the text at or right of the target: it starts no
 * further left than a hanging label, or it **crosses** the target.
 *
 * The second half was found in the browser. A LaTeX table link lands partway
 * along its caption's first line, and that line is one run starting well to
 * the left — ignored, the column was measured from the lines below and the
 * crop cut "Table 3:" off one side and the caption's end off the other.
 */
function reachesTarget(run: TextRun, top: Point): boolean {
  return (
    run.rect.origin.x >= top.x - LEFT_SLACK ||
    run.rect.origin.x + run.rect.size.width > top.x
  )
}

/**
 * The left and right edges of the column the target sits in.
 *
 * For each line in the first few below the top, the runs are walked left to
 * right from the first one at the target, and the walk stops at a gap wider
 * than any inside a line — the gutter. The widest such extent is the column.
 * With no text to measure (a figure), the column runs from the target to the
 * matching margin on the right.
 */
function columnAt(page: PageText, top: Point): { left: number; right: number } {
  let left = top.x
  let right = -Infinity

  const lines = page.runs.filter(
    (run) =>
      run.rect.origin.y >= top.y - LINE_TOLERANCE &&
      run.rect.origin.y < top.y + COLUMN_PROBE_DEPTH,
  )
  const byLine = new Map<number, TextRun[]>()
  for (const run of lines) {
    const key = Math.round(run.rect.origin.y / LINE_TOLERANCE)
    byLine.set(key, [...(byLine.get(key) ?? []), run])
  }

  for (const line of byLine.values()) {
    const sorted = line
      .filter((run) => reachesTarget(run, top))
      .sort((a, b) => a.rect.origin.x - b.rect.origin.x)
    const [first] = sorted
    // A line that starts beyond a hanging indent is the other column's, even
    // when it sits between this column's lines — measured on a BERT page, where
    // the right column's baselines fall between the left's.
    if (!first || first.rect.origin.x > top.x + HANGING_INDENT) {
      continue
    }
    left = Math.min(left, first.rect.origin.x)
    let edge = first.rect.origin.x + first.rect.size.width
    for (const run of sorted.slice(1)) {
      if (run.rect.origin.x - edge > COLUMN_GAP) {
        break
      }
      edge = Math.max(edge, run.rect.origin.x + run.rect.size.width)
    }
    right = Math.max(right, edge)
  }

  if (right === -Infinity) {
    right = Math.max(page.width - top.x, top.x + MIN_WIDTH)
  }
  return { left, right: Math.max(right, left + MIN_WIDTH) }
}

/**
 * Where the entry starting at `top` ends.
 *
 * The nearest of: another link landing below it in the same column, or — for a
 * snapped citation — the line starting with the next label. Landings alone
 * would not do for a publisher PDF, whose landings are as imprecise as the one
 * that needed snapping. With neither, the block of text at the top, as
 * `blockBottom` reads it; never taller than the cap.
 */
function entryBottom({
  page,
  pageIndex,
  top,
  column,
  number,
  landings,
}: {
  page: PageText
  pageIndex: number
  top: number
  column: { left: number; right: number }
  number: number | null
  landings: readonly LinkLanding[]
}): number {
  const { left } = column
  const below = (y: number) => y > top + LINE_TOLERANCE / 2
  const candidates = landings
    .filter(
      (landing) =>
        landing.pageIndex === pageIndex &&
        Math.abs(landing.x - left) < SAME_COLUMN &&
        below(landing.y),
    )
    .map((landing) => landing.y)

  if (number !== null) {
    for (const run of page.runs) {
      if (labelOf(run) === number + 1 && below(run.rect.origin.y)) {
        candidates.push(run.rect.origin.y)
      }
    }
  }

  const next = Math.min(...candidates)
  const height = Number.isFinite(next)
    ? next - top
    : blockBottom(page, top, column) - top
  return top + Math.min(height, MAX_HEIGHT)
}

/**
 * Where the block of text starting at `top` ends, within its column.
 *
 * For an entry with nothing below it to bound it — the last reference on a
 * page, a section heading, a caption. Lines are read down the column, and the
 * block ends at the first of:
 *
 * - **a gap** wider than `PARAGRAPH_GAP` line pitches;
 * - **a line returning to the left edge** after indented ones — the next entry
 *   of a hanging-indent reference list, which is how author–year lists are set.
 *
 * **Except under a caption.** A block that opens "Table 3:" is a caption, and
 * the table it names is below it *after* a gap — ended there, the preview of a
 * table link was its caption alone (found in the browser). A caption's block
 * runs to the height cap instead.
 *
 * With no lines at all, `FALLBACK_HEIGHT`.
 */
function blockBottom(
  page: PageText,
  top: number,
  column: { left: number; right: number },
): number {
  const lines = new Map<number, { y: number; x: number; bottom: number }>()
  for (const run of page.runs) {
    const { x, y } = run.rect.origin
    if (
      y < top - LINE_TOLERANCE / 2 ||
      x < column.left - LEFT_SLACK ||
      x > column.left + HANGING_INDENT
    ) {
      continue
    }
    const key = Math.round(y / LINE_TOLERANCE)
    const line = lines.get(key)
    const bottom = y + run.rect.size.height
    lines.set(
      key,
      line
        ? {
            y: Math.min(line.y, y),
            x: Math.min(line.x, x),
            bottom: Math.max(line.bottom, bottom),
          }
        : { y, x, bottom },
    )
  }

  const ordered = [...lines.values()].sort((a, b) => a.y - b.y)
  const [first, second] = ordered
  if (!first) {
    return top + FALLBACK_HEIGHT
  }

  const firstText = page.runs
    .filter((run) => Math.abs(run.rect.origin.y - first.y) <= LINE_TOLERANCE)
    .sort((a, b) => a.rect.origin.x - b.rect.origin.x)
    .map((run) => run.text)
    .join('')
  if (CAPTION.test(firstText)) {
    return top + MAX_HEIGHT
  }

  const pitch = second ? second.y - first.y : first.bottom - first.y
  const hanging = second !== undefined && second.x > first.x + 2
  let bottom = first.bottom
  for (let i = 1; i < ordered.length; i++) {
    const line = ordered[i]
    const previous = ordered[i - 1]
    if (!line || !previous) {
      break
    }
    if (line.y - previous.y > pitch * PARAGRAPH_GAP) {
      break
    }
    if (hanging && Math.abs(line.x - first.x) <= 2) {
      break
    }
    bottom = line.bottom
  }
  return bottom
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}
