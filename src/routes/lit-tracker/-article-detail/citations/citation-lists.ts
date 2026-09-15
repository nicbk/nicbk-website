import type { Author } from '~/db/schema/lit-tracker'

/**
 * What the citations view shows, worked out from the two synced queries
 * (`queries.citationEdges.references` and `.citedBy`) without touching React.
 *
 * Kept pure so every rule the view promises — which list a row belongs to, the
 * order, the counts, and which sentence explains an empty or partial list — is
 * asserted directly (features/citation-graph-traversal, task 4).
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
  /** Papers this one cites that are in the collection, newest first. */
  inCollection: CitationArticle[]
  /** Papers in the collection that cite this one, newest first. */
  citedBy: CitationArticle[]
  /** Everything else this one cites, in the paper's own order. */
  outside: OutsideReference[]
  /** How many references were read, in or out of the collection. */
  referencesRead: number
}

/**
 * Sorts the synced rows into the three lists.
 *
 * `references` arrives in edge-id order, which is the order the bibliography
 * was parsed in — the paper's own — so the outside list keeps it untouched.
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
  const outside: OutsideReference[] = []
  const inCollection: CitationArticle[] = []

  for (const edge of references) {
    if (edge.citedArticle) {
      inCollection.push(edge.citedArticle)
    } else {
      outside.push({
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
    inCollection: newestFirst(onePerArticle(inCollection)),
    citedBy: newestFirst(onePerArticle(citing)),
    outside,
    referencesRead: references.length,
  }
}

/** Which sentence, if any, explains a list. */
export type CitationNotice =
  | { kind: 'not-read' }
  | { kind: 'none-in-collection' }
  | { kind: 'all-in-collection' }
  | { kind: 'not-cited' }
  | { kind: 'partly-read'; read: number; total: number }

export type CitationTab = 'in-collection' | 'cited-by' | 'outside'

/**
 * The sentences a tab shows above (or instead of) its rows.
 *
 * **Empty and incomplete are different**, and the reader is told which:
 *  - no references at all means the bibliography was never read — not that the
 *    paper cites nothing;
 *  - references, none of them in the collection, is a real answer;
 *  - fewer references than Semantic Scholar counts means some were missed, so
 *    the two reference tabs say how many of how many.
 *
 * `referenceCount` is Semantic Scholar's, and `null` when the paper was never
 * matched there — in which case no shortfall can be claimed.
 */
export function citationNotices(
  tab: CitationTab,
  lists: CitationLists,
  referenceCount: number | null,
): CitationNotice[] {
  if (tab === 'cited-by') {
    return lists.citedBy.length === 0 ? [{ kind: 'not-cited' }] : []
  }

  if (lists.referencesRead === 0) {
    return [{ kind: 'not-read' }]
  }

  const notices: CitationNotice[] = []
  if (referenceCount !== null && referenceCount > lists.referencesRead) {
    notices.push({
      kind: 'partly-read',
      read: lists.referencesRead,
      total: referenceCount,
    })
  }
  if (tab === 'in-collection' && lists.inCollection.length === 0) {
    notices.push({ kind: 'none-in-collection' })
  }
  if (tab === 'outside' && lists.outside.length === 0) {
    notices.push({ kind: 'all-in-collection' })
  }
  return notices
}

/** The words for each notice. */
export function noticeText(notice: CitationNotice): string {
  switch (notice.kind) {
    case 'not-read':
      return 'its bibliography was not read.'
    case 'none-in-collection':
      return 'it cites nothing else in your collection.'
    case 'all-in-collection':
      return 'everything it cites is in your collection.'
    case 'not-cited':
      return 'nothing in your collection cites it.'
    case 'partly-read':
      return `${notice.read} of ${notice.total} references read.`
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
