import type { ContentsEntry } from '~/lit-tracker/contents/contents'
import type { TeiElement } from './document'
import { attribute, element, elements, path, textOf } from './document'
import { parseRegion } from './regions'

/**
 * A paper's numbered section headings, as GROBID reads them, with where each is
 * printed (features/a-paper-shows-its-contents).
 *
 * **Numbered heads only.** GROBID marks a body heading it recognises as a
 * section with `n`, its number. It also emits `<head>` for things that are not
 * sections at all — measured on a real PLDI paper: labels inside a diagram
 * ("Interpret Bytecodes", "Monitor", "Record") and run-in paragraph heads
 * ("Type specialization.") — and those carry no number. Keeping the numbered
 * ones gave that paper exactly its sections, and a list with diagram labels in
 * it is worse than none.
 *
 * **The number is part of the title**, as the paper prints it, and its parts
 * are the depth: `3` is a section, `3.1` a subsection.
 *
 * **Placed by `teiCoordinates=head`**, the box GROBID reports for the heading
 * (`regions.ts` parses the format). A heading with no box has no page to go to
 * and is left out.
 */
export function parseSections(root: TeiElement): ContentsEntry[] {
  const body = path(root, 'text', 'body')
  if (!body) {
    return []
  }

  const entries: ContentsEntry[] = []
  for (const division of elements(body, 'div')) {
    const head = element(division, 'head')
    if (!head) {
      continue
    }
    const number = sectionNumber(attribute(head, 'n'))
    const region = parseRegion(attribute(head, 'coords'))
    const title = textOf(head)
    if (!number || !region || title === '') {
      continue
    }
    entries.push({
      title: `${number} ${title}`,
      depth: number.split('.').length,
      pageIndex: region.pageIndex,
      top: region.boxes[0]?.y ?? null,
    })
  }
  return entries
}

/**
 * The section number in `n`, normalised — `3.1.` and `3.1` are the same — or
 * null when it is not a section number at all. GROBID's numbers are dotted
 * digits; anything else in `n` is not one this reader can nest.
 */
function sectionNumber(n: string | undefined): string | null {
  const trimmed = n?.trim().replace(/\.$/, '')
  return trimmed && /^\d+(\.\d+)*$/.test(trimmed) ? trimmed : null
}
