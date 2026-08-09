import type { SemanticScholarPaper } from './client'

/**
 * Turning a Semantic Scholar record into the columns an article keeps.
 *
 * ## Which side wins
 *
 * The two sources are good at different things, and the rule follows that
 * rather than picking a winner outright.
 *
 * - **GROBID read the actual PDF**, so it holds the better `title` and
 *   `authors` — and demonstrably so: it reports "Attention Is All You Need" as
 *   printed, where Semantic Scholar's record says "Attention is All you Need".
 *   Neither is ever overwritten.
 * - **Semantic Scholar holds the bibliographic record**, which is where `venue`
 *   and `year` actually live. GROBID returned no venue at all for both papers
 *   this pipeline was built against, and dated the arXiv PDF of *Attention Is
 *   All You Need* to **2023** — the stamp on the revision that was downloaded.
 *   The paper is from 2017, and Semantic Scholar says so.
 *
 * So: **fill anything missing**, and additionally **let Semantic Scholar
 * correct `venue` and `publicationYear` — but only when the match came from an
 * identifier**. A DOI or arXiv id names one paper and cannot be a coincidence.
 * A title match is a guess, however good, and a guess is not grounds for
 * overwriting something read off the document itself.
 */

/** How the paper was found, which decides how much its record is trusted. */
export type MatchKind = 'identifier' | 'title'

/** The article columns enrichment may touch. */
export interface EnrichableArticle {
  publicationYear: number | null
  venue: string | null
  doi: string | null
  abstract: string | null
}

export interface ArticleEnrichment extends EnrichableArticle {
  semanticScholarId: string
}

export function enrichmentFrom(
  paper: SemanticScholarPaper,
  current: EnrichableArticle,
  matchKind: MatchKind,
): ArticleEnrichment {
  const authoritative = matchKind === 'identifier'
  const venue = textOrNull(paper.venue)
  const year = yearOrNull(paper.year)

  return {
    semanticScholarId: paper.paperId,
    // `??` in this order is the whole rule: on an identifier match the API's
    // value is preferred and the existing one is the fallback; otherwise the
    // existing value is preferred and the API only fills a gap.
    venue: authoritative ? (venue ?? current.venue) : (current.venue ?? venue),
    publicationYear: authoritative
      ? (year ?? current.publicationYear)
      : (current.publicationYear ?? year),
    // Fill-only, both of them. A DOI the PDF printed is the paper's own, and an
    // abstract GROBID pulled out of the document is that document's text rather
    // than a database's summary of it.
    doi: current.doi ?? textOrNull(doiOf(paper)),
    abstract: current.abstract ?? textOrNull(paper.abstract),
  }
}

/** The DOI out of `externalIds`, which is where the batch endpoint puts it. */
function doiOf(paper: SemanticScholarPaper): string | null {
  const doi = paper.externalIds?.['DOI']
  return typeof doi === 'string' ? doi : null
}

/**
 * Empty strings count as absent.
 *
 * The API returns `""` rather than omitting a field for papers it holds an
 * incomplete record of, and writing that into a column would replace "we don't
 * know" with a value that renders as a blank venue.
 */
function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function yearOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1000
    ? value
    : null
}
