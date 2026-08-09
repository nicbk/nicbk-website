import type { TeiElement } from './document'
import {
  attribute,
  element,
  elements,
  elementWhere,
  textOrNull,
} from './document'

/**
 * Field readers shared by the header and the bibliography.
 *
 * TEI describes a paper and a reference to a paper with the same elements, so
 * these read identically in both places. They live here rather than in either
 * file so the two cannot drift into disagreeing about what a title or a year
 * is — which would surface in task 5 as references failing to match articles
 * that are in fact the same paper.
 */

/**
 * A title out of a `<titleStmt>`, `<analytic>` or `<monogr>`.
 *
 * GROBID marks the principal title `type="main"` and can emit sub-titles and
 * abbreviated forms alongside it, so the marked one is preferred; the first is
 * a fallback for containers that carry no type at all.
 */
export function titleIn(container: TeiElement): string | null {
  const main =
    elementWhere(container, 'title', 'type', 'main') ??
    element(container, 'title')
  return textOrNull(main)
}

/**
 * The first usable four-digit year among a container's `<date>` children.
 *
 * TEI's `@when` may be `2016`, `2016-08` or `2016-08-02`, and only the year is
 * stored. Anything before 1000 is treated as noise rather than a date — GROBID
 * occasionally reads a page range or a figure number as one, and a paper from
 * the year 42 is a mis-parse every time.
 */
export function publicationYearIn(container: TeiElement): number | null {
  for (const date of elements(container, 'date')) {
    const match = attribute(date, 'when')?.match(/^(\d{4})/)
    if (!match?.[1]) {
      continue
    }
    const year = Number(match[1])
    if (year >= 1000) {
      return year
    }
  }
  return null
}

/**
 * A DOI, searched across a `<biblStruct>` and both of its parts.
 *
 * GROBID attaches `<idno type="DOI">` to whichever part the identifier belongs
 * to — directly on the structure for a preprint, under `<analytic>` for a
 * published article, under `<monogr>` for a book — so all three are searched
 * rather than guessing at the document's kind.
 */
export function doiIn(biblStruct: TeiElement): string | null {
  const containers = [
    biblStruct,
    element(biblStruct, 'analytic'),
    element(biblStruct, 'monogr'),
  ]
  for (const container of containers) {
    const doi = container
      ? textOrNull(elementWhere(container, 'idno', 'type', 'DOI'))
      : null
    if (doi) {
      return doi
    }
  }
  return null
}
