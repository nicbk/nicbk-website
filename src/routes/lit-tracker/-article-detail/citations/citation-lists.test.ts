import { describe, expect, it } from 'vitest'
import type { CitationArticle, CitationEdge } from './citation-lists'
import {
  citationLists,
  citationNotices,
  noticeText,
  semanticScholarUrl,
} from './citation-lists'

/**
 * Which list a citation belongs to, in what order, and which sentence explains
 * a list — the rules the citations view promises, without React.
 */

let next = 0

function article(
  title: string,
  publicationYear: number | null,
): CitationArticle {
  next += 1
  return {
    id: `article-${next}`,
    title,
    authors: [{ name: 'A. Author' }],
    publicationYear,
  }
}

function edge(fields: Partial<CitationEdge> = {}): CitationEdge {
  next += 1
  return {
    id: `edge-${next}`,
    title: `Reference ${next}`,
    authors: [],
    publicationYear: null,
    semanticScholarId: null,
    rawText: null,
    ...fields,
  }
}

describe('citationLists', () => {
  it('puts a reference with its article in the collection, and one without outside', () => {
    const bert = article('BERT', 2019)
    const lists = citationLists(
      [edge({ citedArticle: bert }), edge({ title: 'Adam' })],
      [],
    )

    expect(lists.inCollection).toEqual([bert])
    expect(lists.outside.map((row) => row.title)).toEqual(['Adam'])
    expect(lists.referencesRead).toBe(2)
  })

  it('treats a missing related article as outside, whether null or undefined', () => {
    // The client gives `undefined` for a relation with no row and server-side
    // ZQL gives `null`; an edge pointing at another account's article arrives
    // as either, because the query scopes the relation to its owner.
    const lists = citationLists(
      [edge({ citedArticle: null }), edge({ citedArticle: undefined })],
      [edge({ citingArticle: null }), edge({})],
    )

    expect(lists.inCollection).toEqual([])
    expect(lists.outside).toHaveLength(2)
    expect(lists.citedBy).toEqual([])
  })

  it('orders papers in the collection newest first, with no year last', () => {
    const old = article('LSTM', 1997)
    const undated = article('A scanned report', null)
    const recent = article('BERT', 2019)
    const alsoRecent = article('GPT', 2019)

    const lists = citationLists(
      [
        edge({ citedArticle: old }),
        edge({ citedArticle: undated }),
        edge({ citedArticle: recent }),
        edge({ citedArticle: alsoRecent }),
      ],
      [edge({ citingArticle: old }), edge({ citingArticle: recent })],
    )

    // Ties keep the paper's own order.
    expect(lists.inCollection).toEqual([recent, alsoRecent, old, undated])
    expect(lists.citedBy).toEqual([recent, old])
  })

  it('keeps outside references in the order the paper printed them', () => {
    const lists = citationLists(
      [
        edge({ title: 'Zeta', publicationYear: 2020 }),
        edge({ title: 'Alpha', publicationYear: 1990 }),
        edge({ title: 'Mu', publicationYear: 2005 }),
      ],
      [],
    )

    expect(lists.outside.map((row) => row.title)).toEqual([
      'Zeta',
      'Alpha',
      'Mu',
    ])
  })

  it('lists a paper once, however many references resolve to it', () => {
    const bert = article('BERT', 2019)
    const lists = citationLists(
      [edge({ citedArticle: bert }), edge({ citedArticle: bert })],
      [],
    )

    expect(lists.inCollection).toEqual([bert])
  })

  it('carries the printed text, and a link only for a Semantic Scholar id', () => {
    const lists = citationLists(
      [
        edge({
          rawText: '  A. Vaswani. Attention. 2017.  ',
          semanticScholarId: 'abc',
        }),
        edge({ rawText: '   ' }),
      ],
      [],
    )

    expect(lists.outside[0]).toMatchObject({
      rawText: 'A. Vaswani. Attention. 2017.',
      semanticScholarUrl: 'https://www.semanticscholar.org/paper/abc',
    })
    // Blank printed text is no printed text, so the row falls back to title.
    expect(lists.outside[1]).toMatchObject({
      rawText: null,
      semanticScholarUrl: null,
    })
  })
})

describe('semanticScholarUrl', () => {
  it('encodes the id rather than trusting it', () => {
    expect(semanticScholarUrl('a/../b?c')).toBe(
      'https://www.semanticscholar.org/paper/a%2F..%2Fb%3Fc',
    )
    expect(semanticScholarUrl(null)).toBeNull()
    expect(semanticScholarUrl('')).toBeNull()
  })
})

describe('citationNotices', () => {
  const bert = article('BERT', 2019)

  it('says the bibliography was not read when there are no references at all', () => {
    const lists = citationLists([], [])

    expect(citationNotices('in-collection', lists, 41)).toEqual([
      { kind: 'not-read' },
    ])
    expect(citationNotices('outside', lists, null)).toEqual([
      { kind: 'not-read' },
    ])
  })

  it('says it cites nothing in the collection when references exist but none are', () => {
    const lists = citationLists([edge()], [])

    expect(citationNotices('in-collection', lists, null)).toEqual([
      { kind: 'none-in-collection' },
    ])
  })

  it('counts a shortfall against Semantic Scholar on both reference tabs', () => {
    const lists = citationLists([edge({ citedArticle: bert }), edge()], [])

    expect(citationNotices('in-collection', lists, 41)).toEqual([
      { kind: 'partly-read', read: 2, total: 41 },
    ])
    expect(citationNotices('outside', lists, 41)).toEqual([
      { kind: 'partly-read', read: 2, total: 41 },
    ])
  })

  it('claims no shortfall without a count, or when the count is met', () => {
    const lists = citationLists([edge({ citedArticle: bert }), edge()], [])

    expect(citationNotices('outside', lists, null)).toEqual([])
    expect(citationNotices('outside', lists, 2)).toEqual([])
    expect(citationNotices('outside', lists, 1)).toEqual([])
  })

  it('says when everything cited is in the collection', () => {
    const lists = citationLists([edge({ citedArticle: bert })], [])

    expect(citationNotices('outside', lists, null)).toEqual([
      { kind: 'all-in-collection' },
    ])
  })

  it('says when nothing in the collection cites it, whatever its references', () => {
    expect(citationNotices('cited-by', citationLists([], []), 41)).toEqual([
      { kind: 'not-cited' },
    ])
    expect(
      citationNotices(
        'cited-by',
        citationLists([], [edge({ citingArticle: bert })]),
        41,
      ),
    ).toEqual([])
  })

  it('words each notice', () => {
    expect(noticeText({ kind: 'not-read' })).toBe(
      'its bibliography was not read.',
    )
    expect(noticeText({ kind: 'none-in-collection' })).toBe(
      'it cites nothing else in your collection.',
    )
    expect(noticeText({ kind: 'partly-read', read: 40, total: 41 })).toBe(
      '40 of 41 references read.',
    )
    expect(noticeText({ kind: 'all-in-collection' })).toMatch(/everything/)
    expect(noticeText({ kind: 'not-cited' })).toMatch(/nothing .* cites it/)
  })
})
