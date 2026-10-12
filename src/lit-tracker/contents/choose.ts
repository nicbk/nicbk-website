import type { ContentsEntry, ContentsSource } from './contents'
import { isUsableOutline } from './outline'

/**
 * Which of a paper's two possible contents to keep
 * (features/a-paper-shows-its-contents).
 *
 * **The PDF's own outline first.** It is exact — the author or publisher wrote
 * it, and each entry names its page — where GROBID's headings are a reading of
 * the printed page, trained on articles and not on books. **GROBID's numbered
 * headings second**, for the papers (most LaTeX papers without `hyperref`,
 * many publisher PDFs) that carry no outline. **Otherwise none**, said plainly,
 * rather than a guess.
 *
 * `outline` is null when the PDF could not be read for one at all; the headings
 * can still stand in, since they came from GROBID rather than from the PDF.
 */
export function chooseContents(
  outline: readonly ContentsEntry[] | null,
  headings: readonly ContentsEntry[],
): { source: ContentsSource; entries: ContentsEntry[] } {
  if (outline && isUsableOutline(outline)) {
    return { source: 'outline', entries: [...outline] }
  }
  if (headings.length > 0) {
    return { source: 'headings', entries: [...headings] }
  }
  return { source: 'none', entries: [] }
}
