import type { TeiElement } from './document'
import { attribute, element, elements, textOf } from './document'

/**
 * The identifiers a paper — or a reference to one — carries, read out of TEI's
 * `<idno>` elements.
 *
 * These exist to be looked up. Semantic Scholar resolves a paper from any one
 * of them (`DOI:`, `ARXIV:`, `PMID:`), and that lookup is the only thing
 * standing between a bibliography entry and a real citation edge, so it is
 * worth reading every kind GROBID emits rather than only the tidiest one.
 *
 * ## Why not DOI alone
 *
 * Measured against the two papers this pipeline was built on, from GROBID's own
 * output:
 *
 * | | references | DOI | arXiv | PubMed | none |
 * |---|---|---|---|---|---|
 * | *Attention Is All You Need* | 40 | 0 | 16 | 0 | 24 |
 * | a PLOS ONE article | 41 | 32 | 0 | 37 | 1 |
 *
 * A DOI-only reader resolves nothing at all for the first paper, and misses
 * that paper's *own* identifier too — its header carries an arXiv id and no
 * DOI. Computer science publishes on arXiv and biomedicine indexes in PubMed;
 * reading one identifier means serving half a library.
 */
export interface PaperIdentifiers {
  /** A DOI with any `doi:`/URL prefix removed, e.g. `10.1371/journal.pone.0173664`. */
  doi: string | null
  /** A bare arXiv id, without the `arXiv:` prefix, version or category. */
  arxivId: string | null
  /** A PubMed id: digits only. */
  pubmedId: string | null
}

/** Nothing found — the shape returned for a reference with no identifiers. */
const NONE: PaperIdentifiers = { doi: null, arxivId: null, pubmedId: null }

/**
 * Reads the identifiers of a `<biblStruct>`, searching it and both of its parts.
 *
 * GROBID attaches `<idno>` to whichever part the identifier belongs to —
 * directly on the structure for a preprint, under `<analytic>` for a published
 * article, under `<monogr>` for a book — so all three are searched rather than
 * guessing at the document's kind.
 */
export function identifiersIn(biblStruct: TeiElement): PaperIdentifiers {
  const containers = [
    biblStruct,
    element(biblStruct, 'analytic'),
    element(biblStruct, 'monogr'),
  ]

  const found = { ...NONE }
  for (const container of containers) {
    if (!container) {
      continue
    }
    for (const idno of elements(container, 'idno')) {
      // `type` is absent on the `<idno>`s GROBID could not classify — which are
      // real ("CoRR, abs/1409.0473") but ambiguous, and guessing at them is how
      // a reference gets resolved to the wrong paper.
      const type = attribute(idno, 'type')?.toLowerCase()
      const value = textOf(idno)
      if (!type || value.length === 0) {
        continue
      }
      // The first *usable* one wins per kind — a value that normalizes to null
      // leaves the slot open for a later `<idno>` of the same kind to fill.
      if (type === 'doi') {
        found.doi ??= normalizeDoi(value)
      } else if (type === 'arxiv') {
        found.arxivId ??= normalizeArxivId(value)
      } else if (type === 'pmid') {
        found.pubmedId ??= normalizePubmedId(value)
      }
    }
  }
  return found
}

/**
 * A DOI with the prefixes real documents print it with removed.
 *
 * GROBID usually yields a bare DOI, but a reference typeset as
 * `doi:10.1234/x` or `https://doi.org/10.1234/x` sometimes keeps its prefix.
 * Every DOI begins `10.`, so anything that does not is a mis-parse rather than
 * an identifier worth sending to a lookup.
 */
function normalizeDoi(value: string): string | null {
  const withoutPrefix = value
    .trim()
    .replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '')
    .trim()
  return withoutPrefix.startsWith('10.') ? withoutPrefix : null
}

/**
 * A bare arXiv id, stripped of everything Semantic Scholar will not accept.
 *
 * This is not tidying. GROBID emits the identifier exactly as the paper prints
 * it — `arXiv:1706.03762v7[cs.CL]` — and Semantic Scholar returns **null** for
 * `ARXIV:1706.03762v7` while resolving `ARXIV:1706.03762`, so the version
 * suffix alone is the difference between an edge and a placeholder.
 *
 * Both id schemes are matched: the current `1706.03762` form, and the pre-2007
 * `archive/YYMMNNN` form (`hep-th/9901001`, `cs.CL/0701001`).
 */
function normalizeArxivId(value: string): string | null {
  const match = value.match(/(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})/i)
  return match?.[1] ?? null
}

/** A PubMed id: the digits, and nothing a reference printed around them. */
function normalizePubmedId(value: string): string | null {
  const match = value.match(/\d+/)
  return match?.[0] ?? null
}
