import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import type { ReadingLine } from '../reader-jump'

/**
 * How far below the reading line a heading may start and still count as
 * reached, in page points. A jump puts the heading *on* the line, and a smooth
 * scroll can stop a fraction of a pixel short of it; without this, the entry a
 * reader chose could be shown as not yet reached.
 */
export const LINE_TOLERANCE_PT = 4

/**
 * The index of the section the reader is in: the last entry, in the paper's
 * order, whose start is at or above the reading line (`reader/reading-line.ts`
 * says where that is). `-1` before the first section, or with no reader.
 *
 * An entry with no `top` starts at its page's top, which is where a jump to it
 * goes.
 */
export function sectionInView(
  entries: readonly ContentsEntry[],
  line: ReadingLine | null,
): number {
  if (line === null) {
    return -1
  }
  let found = -1
  entries.forEach((entry, index) => {
    const reached =
      entry.pageIndex < line.pageIndex ||
      (entry.pageIndex === line.pageIndex &&
        (entry.top ?? 0) <= line.top + LINE_TOLERANCE_PT)
    if (reached) {
      found = index
    }
  })
  return found
}
