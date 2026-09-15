import { describe, expect, it } from 'vitest'
import type { CitationArticle, CitationEdge } from './citation-lists'
import {
  citationLists,
  citationNotice,
  citesCount,
  noticeText,
  semanticScholarUrl,
} from './citation-lists'

/**
 * Which group a citation belongs to, in what order, and which sentence explains
 * an empty tab — the rules the citations view promises, without React.
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
  it('groups what it cites by whether the cited paper is in the collection', () => {
    const bert = article('BERT', 2019)
    const lists = citationLists(
      [edge({ citedArticle: bert }), edge({ title: 'Adam' })],
      [],
    )

    expect(lists.cites.inCollection).toEqual([bert])
    expect(lists.cites.elsewhere.map((row) => row.title)).toEqual(['Adam'])
    expect(citesCount(lists)).toBe(2)
  })

  it('treats a missing related article as elsewhere, whether null or undefined', () => {
    // The client gives `undefined` for a relation with no row and server-side
    // ZQL gives `null`; an edge pointing at another account's article arrives
    // as either, because the query scopes the relation to its owner.
    const lists = citationLists(
      [edge({ citedArticle: null }), edge({ citedArticle: undefined })],
      [edge({ citingArticle: null }), edge({})],
    )

    expect(lists.cites.inCollection).toEqual([])
    expect(lists.cites.elsewhere).toHaveLength(2)
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
    expect(lists.cites.inCollection).toEqual([recent, alsoRecent, old, undated])
    expect(lists.citedBy).toEqual([recent, old])
  })

  it('keeps references elsewhere in the order the paper printed them', () => {
    const lists = citationLists(
      [
        edge({ title: 'Zeta', publicationYear: 2020 }),
        edge({ title: 'Alpha', publicationYear: 1990 }),
        edge({ title: 'Mu', publicationYear: 2005 }),
      ],
      [],
    )

    expect(lists.cites.elsewhere.map((row) => row.title)).toEqual([
      'Zeta',
      'Alpha',
      'Mu',
    ])
  })

  it('lists a paper once, however many references resolve to it', () => {
    const bert = article('BERT', 2019)
    const lists = citationLists(
      [edge({ citedArticle: bert }), edge({ citedArticle: bert })],
      [edge({ citingArticle: bert }), edge({ citingArticle: bert })],
    )

    expect(lists.cites.inCollection).toEqual([bert])
    expect(lists.citedBy).toEqual([bert])
    expect(citesCount(lists)).toBe(1)
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

    expect(lists.cites.elsewhere[0]).toMatchObject({
      rawText: 'A. Vaswani. Attention. 2017.',
      semanticScholarUrl: 'https://www.semanticscholar.org/paper/abc',
    })
    // Blank printed text is no printed text, so the row falls back to title.
    expect(lists.cites.elsewhere[1]).toMatchObject({
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

describe('citationNotice', () => {
  const bert = article('BERT', 2019)

  it('says the bibliography was not read when there are no references at all', () => {
    expect(citationNotice('cites', citationLists([], []))).toBe('not-read')
  })

  it('says it cites nothing in the collection when every reference is elsewhere', () => {
    expect(citationNotice('cites', citationLists([edge()], []))).toBe(
      'none-in-collection',
    )
  })

  it('says nothing when some of what it cites is in the collection', () => {
    expect(
      citationNotice(
        'cites',
        citationLists([edge({ citedArticle: bert }), edge()], []),
      ),
    ).toBeNull()
  })

  it('says when nothing in the collection cites it, whatever its references', () => {
    expect(citationNotice('cited-by', citationLists([edge()], []))).toBe(
      'not-cited',
    )
    expect(
      citationNotice(
        'cited-by',
        citationLists([], [edge({ citingArticle: bert })]),
      ),
    ).toBeNull()
  })

  it('words each notice', () => {
    expect(noticeText('not-read')).toBe('its bibliography was not read.')
    expect(noticeText('none-in-collection')).toBe(
      'it cites nothing else in your collection.',
    )
    expect(noticeText('not-cited')).toBe('nothing in your collection cites it.')
  })
})
