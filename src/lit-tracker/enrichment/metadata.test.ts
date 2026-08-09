import { describe, expect, it } from 'vitest'
import type { SemanticScholarPaper } from './client'
import type { EnrichableArticle } from './metadata'
import { enrichmentFrom } from './metadata'

/**
 * Which source wins, field by field.
 *
 * The rule is asymmetric on purpose and the asymmetry is the whole point:
 * GROBID read the PDF and holds the better title, Semantic Scholar holds the
 * bibliographic record and knows the venue and the year. Getting this backwards
 * is invisible — the article still looks complete, it is just wrong.
 */

const GROBID: EnrichableArticle = {
  publicationYear: 2023,
  venue: null,
  doi: null,
  abstract: 'The abstract as it was printed in the document.',
}

function paper(
  overrides: Partial<SemanticScholarPaper> = {},
): SemanticScholarPaper {
  return {
    paperId: '204e3073870fae3d05bcbc2f6a8e263d9b72e776',
    title: 'Attention is All you Need',
    abstract: "Semantic Scholar's copy of the abstract.",
    year: 2017,
    venue: 'Neural Information Processing Systems',
    externalIds: { ArXiv: '1706.03762', CorpusId: 13756489 },
    authors: [{ name: 'Ashish Vaswani' }],
    ...overrides,
  }
}

describe('a match found by identifier', () => {
  it('always records the Semantic Scholar id', () => {
    expect(
      enrichmentFrom(paper(), GROBID, 'identifier').semanticScholarId,
    ).toBe('204e3073870fae3d05bcbc2f6a8e263d9b72e776')
  })

  it('fills in the venue GROBID could not find', () => {
    // Not an edge case: GROBID returned no venue at all for either of the two
    // real papers this pipeline was built against, because with consolidation
    // off an arXiv `<monogr>` carries only an imprint date.
    expect(enrichmentFrom(paper(), GROBID, 'identifier').venue).toBe(
      'Neural Information Processing Systems',
    )
  })

  it('corrects a year GROBID read off the wrong date', () => {
    // The concrete case: GROBID dated the arXiv PDF of *Attention Is All You
    // Need* to 2023, the stamp on the revision that was downloaded. The paper
    // is from 2017. A DOI or arXiv id names one paper and cannot be a
    // coincidence, so its record is allowed to win.
    expect(enrichmentFrom(paper(), GROBID, 'identifier').publicationYear).toBe(
      2017,
    )
  })

  it('keeps what GROBID found when the API knows less', () => {
    const sparse = paper({ venue: null, year: null })
    const enriched = enrichmentFrom(sparse, GROBID, 'identifier')

    // Overwriting a real value with a null is the one way "let the API win"
    // could lose information, and it is the failure this guards.
    expect(enriched.publicationYear).toBe(2023)
    expect(enriched.venue).toBeNull()
  })

  it('treats an empty string as knowing nothing', () => {
    // The API returns `""` rather than omitting a field for papers it holds an
    // incomplete record of, and that would render as a blank venue.
    expect(
      enrichmentFrom(
        paper({ venue: '  ' }),
        { ...GROBID, venue: 'PLoS ONE' },
        'identifier',
      ).venue,
    ).toBe('PLoS ONE')
  })
})

describe('a match found by title', () => {
  it('does not overwrite anything GROBID read from the document', () => {
    // A title match is a guess, however good. A guess is not grounds for
    // replacing a value read off the paper itself.
    const enriched = enrichmentFrom(paper(), GROBID, 'title')

    expect(enriched.publicationYear).toBe(2023)
  })

  it('still fills in what GROBID was missing', () => {
    expect(enrichmentFrom(paper(), GROBID, 'title').venue).toBe(
      'Neural Information Processing Systems',
    )
  })
})

describe('fields the API never overrules', () => {
  it('keeps the DOI the document printed', () => {
    const enriched = enrichmentFrom(
      paper({ externalIds: { DOI: '10.9999/other' } }),
      { ...GROBID, doi: '10.1145/3612345.3612399' },
      'identifier',
    )

    expect(enriched.doi).toBe('10.1145/3612345.3612399')
  })

  it('takes a DOI from the API when the document had none', () => {
    expect(
      enrichmentFrom(
        paper({ externalIds: { DOI: '10.18653/v1/D17-1151' } }),
        GROBID,
        'identifier',
      ).doi,
    ).toBe('10.18653/v1/D17-1151')
  })

  it('keeps the abstract GROBID pulled out of the PDF', () => {
    // That text is the document's own, rather than a database's summary of it.
    expect(enrichmentFrom(paper(), GROBID, 'identifier').abstract).toBe(
      GROBID.abstract,
    )
  })

  it('takes the API abstract only when the document yielded none', () => {
    expect(
      enrichmentFrom(paper(), { ...GROBID, abstract: null }, 'identifier')
        .abstract,
    ).toBe("Semantic Scholar's copy of the abstract.")
  })
})

describe('values that are not usable', () => {
  it('ignores a year that cannot be one', () => {
    // The same floor the TEI parser applies: GROBID occasionally reads a page
    // range as a date, and so, occasionally, does everyone else.
    expect(
      enrichmentFrom(
        paper({ year: 42 }),
        { ...GROBID, publicationYear: null },
        'identifier',
      ).publicationYear,
    ).toBeNull()
  })

  it('ignores a non-string DOI', () => {
    expect(
      enrichmentFrom(
        paper({ externalIds: { DOI: 12345 } }),
        GROBID,
        'identifier',
      ).doi,
    ).toBeNull()
  })
})
