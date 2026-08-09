import type { Author } from '~/db/schema'
import { authorsOf } from './authors'
import type { TeiElement } from './document'
import {
  attribute,
  element,
  elements,
  elementWhere,
  path,
  textOrNull,
} from './document'
import { doiIn, publicationYearIn, titleIn } from './fields'

/**
 * The parsed reference list, out of TEI's `<listBibl>`.
 *
 * **Nothing persists these yet.** `citation_edges` and the resolution of an
 * entry against the user's other articles are task 5's; this task parses and
 * tests them so that task inherits a surface already known to work against real
 * GROBID output, rather than writing the parser and the graph in one review.
 */
export interface BibliographyEntry {
  title: string | null
  authors: Author[]
  publicationYear: number | null
  /** The journal or proceedings the reference appeared in. */
  venue: string | null
  doi: string | null
  /**
   * The reference exactly as it was printed, from `includeRawCitations=1`.
   *
   * Kept because it is the only field that survives a badly-segmented
   * reference intact, and so the only one that can be shown to a human when
   * the structured fields come back empty.
   */
  raw: string | null
}

export function parseBibliography(root: TeiElement): BibliographyEntry[] {
  return referenceListsOf(root)
    .flatMap((list) => elements(list, 'biblStruct'))
    .map(parseEntry)
}

/**
 * The `<listBibl>` elements holding references.
 *
 * GROBID puts them in `<back>` under a `type="references"` division, but emits
 * a plain `<div>` for documents whose reference section it could not label — so
 * the type is used to prefer a division rather than to require one.
 */
function referenceListsOf(root: TeiElement): TeiElement[] {
  const back = path(root, 'text', 'back')
  if (!back) {
    return []
  }
  const divisions = elements(back, 'div')
  const references = divisions.filter(
    (division) => attribute(division, 'type') === 'references',
  )
  return (references.length > 0 ? references : divisions).flatMap((division) =>
    elements(division, 'listBibl'),
  )
}

/**
 * One reference.
 *
 * The `<analytic>`/`<monogr>` split carries the meaning: `<analytic>` is the
 * cited article, `<monogr>` the thing it appeared in. When both are present the
 * title comes from the article and the venue from the container; when only
 * `<monogr>` is present — a whole book, or a preprint — its title is the
 * reference's own and there is no venue to report.
 */
function parseEntry(entry: TeiElement): BibliographyEntry {
  const analytic = element(entry, 'analytic')
  const monogr = element(entry, 'monogr')

  const articleTitle = analytic ? titleIn(analytic) : null
  const containerTitle = monogr ? titleIn(monogr) : null
  const imprint = monogr ? element(monogr, 'imprint') : undefined

  return {
    title: articleTitle ?? containerTitle,
    authors: referenceAuthorsOf(analytic, monogr),
    publicationYear: imprint ? publicationYearIn(imprint) : null,
    venue: articleTitle ? containerTitle : null,
    doi: doiIn(entry),
    raw: textOrNull(elementWhere(entry, 'note', 'type', 'raw_reference')),
  }
}

/**
 * The reference's authors, preferring the cited article's over the container's.
 *
 * A reference to a paper in proceedings carries the paper's authors under
 * `<analytic>`; a reference to a book or a preprint carries them under
 * `<monogr>` with no `<analytic>` at all.
 */
function referenceAuthorsOf(
  analytic: TeiElement | undefined,
  monogr: TeiElement | undefined,
): Author[] {
  const fromArticle = analytic ? authorsOf(analytic) : []
  if (fromArticle.length > 0) {
    return fromArticle
  }
  return monogr ? authorsOf(monogr) : []
}
