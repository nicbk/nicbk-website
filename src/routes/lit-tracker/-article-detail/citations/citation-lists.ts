import type { Author } from '~/db/schema/lit-tracker'

/**
 * What the citations view shows, worked out from the two synced queries
 * (`queries.citationEdges.references` and `.citedBy`) without touching React.
 *
 * Kept pure so every rule the view promises — which group a row belongs to, the
 * order, and which sentence explains an empty tab — is asserted directly
 * (features/citation-graph-traversal, task 4).
 *
 * **Two directions, not three places** (user-decided 2026-09-15). A paper's
 * citations are its forward edges, *what it cites*, and its backward edges,
 * *what cites it*. The first version split the forward edges into two tabs of
 * their own beside "cited by", and the labels read as three places rather than
 * two directions. Whether a cited paper is in the collection is now a grouping
 * inside "cites".
 */

/** The fields of an article this view draws. */
export interface CitationArticle {
  id: string
  title: string
  authors: readonly Author[]
  publicationYear: number | null
}

/**
 * One row of `citation_edges`, with the article at its other end when that
 * article is in this reader's collection.
 *
 * **`null` and `undefined` both mean "not in the collection".** Zero's client
 * gives `undefined` for a relation with no row and its server-side ZQL gives
 * `null` (found in task 3), and the queries scope the related article to its
 * owner — so an edge whose id points somewhere this reader cannot see arrives
 * exactly like one that points nowhere.
 */
export interface CitationEdge {
  id: string
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  semanticScholarId: string | null
  rawText: string | null
  citedArticle?: CitationArticle | null
  citingArticle?: CitationArticle | null
}

/** A reference that is not in the collection, as the view draws it. */
export interface OutsideReference {
  id: string
  /** The reference as the paper printed it, when GROBID kept that. */
  rawText: string | null
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  /** Where it links; `null` means it is plain text. */
  semanticScholarUrl: string | null
}

export interface CitationLists {
  /** What this paper cites. */
  cites: {
    /** The cited papers that are in the collection, newest first. */
    inCollection: CitationArticle[]
    /** Everything else it cites, in the paper's own order. */
    elsewhere: OutsideReference[]
  }
  /** Papers in the collection that cite this one, newest first. */
  citedBy: CitationArticle[]
}

/**
 * Sorts the synced rows into the lists.
 *
 * `references` arrives in edge-id order, which is the order the bibliography
 * was parsed in — the paper's own — so the "elsewhere" group keeps it untouched.
 *
 * **A paper appears once per list.** A bibliography can hold the same work
 * twice (a preprint and its proceedings version, both resolved to the one
 * article), and two identical rows read as a rendering fault rather than as a
 * fact about the paper.
 */
export function citationLists(
  references: readonly CitationEdge[],
  citedBy: readonly CitationEdge[],
): CitationLists {
  const elsewhere: OutsideReference[] = []
  const inCollection: CitationArticle[] = []

  for (const edge of references) {
    if (edge.citedArticle) {
      inCollection.push(edge.citedArticle)
    } else {
      elsewhere.push({
        id: edge.id,
        rawText: blankToNull(edge.rawText),
        title: edge.title,
        authors: edge.authors,
        publicationYear: edge.publicationYear,
        semanticScholarUrl: semanticScholarUrl(edge.semanticScholarId),
      })
    }
  }

  const citing = citedBy.flatMap((edge) =>
    edge.citingArticle ? [edge.citingArticle] : [],
  )

  return {
    cites: {
      inCollection: newestFirst(onePerArticle(inCollection)),
      elsewhere,
    },
    citedBy: newestFirst(onePerArticle(citing)),
  }
}

/** How many rows a "cites" tab shows: both groups together. */
export function citesCount(lists: CitationLists): number {
  return lists.cites.inCollection.length + lists.cites.elsewhere.length
}

export type CitationTab = 'cites' | 'cited-by'

/** The sentence, if any, that stands in for or introduces a tab's rows. */
export type CitationNotice = 'not-read' | 'none-in-collection' | 'not-cited'

/**
 * Which sentence a tab needs.
 *
 * **Empty is not one thing.** A paper with no references at all had its
 * bibliography go unread — it did not cite nothing. A paper whose references
 * are all elsewhere is a real answer, and says so above them.
 *
 * There is deliberately no comparison with Semantic Scholar's reference count.
 * The first version said "40 of 41 references read", and nothing was missing:
 * the count disagreed with the printed bibliography on three of the four local
 * papers (user-decided 2026-09-15 to drop it).
 */
export function citationNotice(
  tab: CitationTab,
  lists: CitationLists,
): CitationNotice | null {
  if (tab === 'cited-by') {
    return lists.citedBy.length === 0 ? 'not-cited' : null
  }
  if (citesCount(lists) === 0) {
    return 'not-read'
  }
  return lists.cites.inCollection.length === 0 ? 'none-in-collection' : null
}

/** The words for each notice. */
export function noticeText(notice: CitationNotice): string {
  switch (notice) {
    case 'not-read':
      return 'its bibliography was not read.'
    case 'none-in-collection':
      return 'it cites nothing else in your collection.'
    case 'not-cited':
      return 'nothing in your collection cites it.'
  }
}

/**
 * A paper's Semantic Scholar page, or `null` without an id.
 *
 * Built only from the stored id, and encoded, never from anything printed in a
 * paper (feature constraints, Security).
 */
export function semanticScholarUrl(id: string | null): string | null {
  if (!id) {
    return null
  }
  return `https://www.semanticscholar.org/paper/${encodeURIComponent(id)}`
}

/** Newest first; a paper with no year goes last. Ties keep their order. */
function newestFirst(articles: CitationArticle[]): CitationArticle[] {
  return articles
    .map((article, index) => ({ article, index }))
    .sort(
      (a, b) =>
        (b.article.publicationYear ?? Number.NEGATIVE_INFINITY) -
          (a.article.publicationYear ?? Number.NEGATIVE_INFINITY) ||
        a.index - b.index,
    )
    .map(({ article }) => article)
}

function onePerArticle(articles: CitationArticle[]): CitationArticle[] {
  const seen = new Set<string>()
  return articles.filter((article) => {
    if (seen.has(article.id)) {
      return false
    }
    seen.add(article.id)
    return true
  })
}

function blankToNull(text: string | null): string | null {
  const trimmed = text?.trim()
  return trimmed ? trimmed : null
}
