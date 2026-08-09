import type { Author } from '~/db/schema'
import { authorsOf } from './authors'
import type { TeiElement } from './document'
import { element, elementWhere, path, textOrNull } from './document'
import { publicationYearIn, titleIn } from './fields'
import type { PaperIdentifiers } from './identifiers'
import { identifiersIn } from './identifiers'

/**
 * The uploaded paper's own metadata, out of the TEI header.
 *
 * Every field is optional in the output because every one of them is optional
 * in practice: a preprint has no venue, a conference paper often has no DOI,
 * and a scanned document can lose its title. Deciding which absences are
 * tolerable belongs to the extract stage, not here — this parser reports what
 * the document contained and nothing more.
 */
export interface HeaderMetadata {
  title: string | null
  authors: Author[]
  abstract: string | null
  publicationYear: number | null
  venue: string | null
  /**
   * What this paper can be looked up by. The DOI is also stored on the article
   * row; the others exist only to resolve it against Semantic Scholar, which is
   * why none of them beyond the DOI has a column of its own.
   */
  identifiers: PaperIdentifiers
}

export function parseHeader(root: TeiElement): HeaderMetadata {
  const fileDesc = path(root, 'teiHeader', 'fileDesc')
  const titleStmt = fileDesc ? element(fileDesc, 'titleStmt') : undefined
  const source = fileDesc
    ? path(fileDesc, 'sourceDesc', 'biblStruct')
    : undefined

  return {
    title: titleStmt ? titleIn(titleStmt) : null,
    authors: source ? headerAuthorsOf(source) : [],
    abstract: textOrNull(path(root, 'teiHeader', 'profileDesc', 'abstract')),
    publicationYear: publicationYearOf(fileDesc, source),
    venue: source ? venueOf(source) : null,
    identifiers: source
      ? identifiersIn(source)
      : { doi: null, arxivId: null, pubmedId: null },
  }
}

/**
 * The paper's authors.
 *
 * `<analytic>` holds the authors of the article itself and `<monogr>` those of
 * the containing work. For a document GROBID could not classify, the authors
 * sometimes land under `<monogr>` alone, so it is read as a fallback rather
 * than ignored.
 */
function headerAuthorsOf(source: TeiElement): Author[] {
  const analytic = element(source, 'analytic')
  const fromArticle = analytic ? authorsOf(analytic) : []
  if (fromArticle.length > 0) {
    return fromArticle
  }
  const monogr = element(source, 'monogr')
  return monogr ? authorsOf(monogr) : []
}

/**
 * Where the paper appeared: the journal, or the proceedings volume.
 *
 * Absent for a preprint, which is most of this collection — the `<monogr>` of
 * an arXiv paper carries only an imprint date.
 */
function venueOf(source: TeiElement): string | null {
  const monogr = element(source, 'monogr')
  if (!monogr) {
    return null
  }
  // `level="j"` is a journal and `level="m"` a monograph or proceedings
  // volume; a journal name is the more specific of the two when both appear.
  const containing =
    elementWhere(monogr, 'title', 'level', 'j') ??
    elementWhere(monogr, 'title', 'level', 'm')
  return textOrNull(containing)
}

/**
 * The publication year, preferring the bibliographic imprint date over the
 * file's own publication date.
 *
 * They differ more often than they look like they should: for an arXiv PDF the
 * imprint date is the paper's, while the publication date can be the date of
 * the particular revision that was downloaded.
 */
function publicationYearOf(
  fileDesc: TeiElement | undefined,
  source: TeiElement | undefined,
): number | null {
  const imprint = source ? path(source, 'monogr', 'imprint') : undefined
  const publicationStmt = fileDesc
    ? element(fileDesc, 'publicationStmt')
    : undefined

  for (const container of [imprint, publicationStmt]) {
    const year = container ? publicationYearIn(container) : null
    if (year !== null) {
      return year
    }
  }
  return null
}
