import type { Author } from '~/db/schema/lit-tracker'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import { ARTICLE_STATUS_LABELS } from '~/lit-tracker/article-status'
import type { CollectionTag } from '~/routes/lit-tracker/-components/article-menu/article-menu'

/** The fields filtering needs from an article; the card needs many more. */
interface FilterableArticle {
  id: string
  title: string
  authors: readonly Author[]
  status: ArticleStatus | null
}

/** The active filters, as the collection's two state hooks report them. */
export interface CollectionFilters {
  /** Free text, matched against title, authors, tags, and reading status. */
  query: string
  /** Tag names; an article must carry ALL of them (AND-composed). */
  tags: readonly string[]
  /** The one reading status to keep, or `undefined` for any. */
  status: ArticleStatus | undefined
}

/**
 * Narrow the collection to the articles matching every active filter,
 * preserving the input order (the caller passes it already newest-first).
 *
 * - **Text** matches case-insensitively as a substring of the article's title,
 *   any author's name, any tag it carries, or its reading status. An empty or
 *   whitespace-only query matches everything. Substring rather than word or
 *   prefix matching, the same rule the blog's search and the rail's tag find
 *   field use — which does mean typing `read` keeps both `read` and `reading`
 *   articles, one status being a prefix of the other.
 * - **Tags are AND-composed**: an article must carry every selected tag. No
 *   selected tags matches everything. This is the thing most easily got
 *   backwards, and the mistake is invisible until a reader selects two — hence
 *   the test written first and this sentence.
 * - **Status** matches the article's own column exactly. An article with no
 *   status is treated as `pending`, the same reading the card takes, so a row
 *   whose column has not been written yet does not fall out of every filter.
 * - The three compose with AND — an article must satisfy all of them. That is
 *   the point of doing this in one function: a reader who has selected a tag in
 *   the rail and then types is asking to narrow what they can already see, and
 *   two filtering passes in two components is how the two come to disagree
 *   about which of them wins.
 *
 * Tags are matched **by name, case-insensitively**, because that is what the URL
 * carries (`search-schema.ts` explains why names rather than ids). A name in the
 * URL that no tag has simply matches nothing, which is the honest answer: the
 * reader asked for articles carrying a tag that does not exist, and there are
 * none. It does not throw, so a stale or hand-edited link degrades to "no
 * articles match" rather than to a broken page.
 *
 * Pure and side-effect free, and given the tag map rather than reaching for it,
 * so the visible set is a direct function of `(rows, tags, filters)` and is
 * unit-testable with no router and no Zero client.
 */
export function filterArticles<Article extends FilterableArticle>(
  articles: readonly Article[],
  tagsByArticle: ReadonlyMap<string, readonly CollectionTag[]>,
  filters: CollectionFilters,
): readonly Article[] {
  const query = filters.query.trim().toLowerCase()

  if (
    query === '' &&
    filters.tags.length === 0 &&
    filters.status === undefined
  ) {
    return articles
  }

  const wanted = filters.tags.map((name) => name.toLowerCase())

  return articles.filter((article) => {
    if (filters.status !== undefined) {
      if ((article.status ?? 'pending') !== filters.status) {
        return false
      }
    }

    // Looked up once and reused: both remaining clauses need this article's
    // tags, and the map lookup plus the lowercasing is the expensive part of
    // filtering a collection on every keystroke.
    const carried = tagsByArticle.get(article.id) ?? []

    if (wanted.length > 0) {
      const carriedNames = new Set(carried.map((tag) => tag.name.toLowerCase()))
      if (!wanted.every((name) => carriedNames.has(name))) {
        return false
      }
    }

    if (query === '') {
      return true
    }

    return searchableText(article, carried).includes(query)
  })
}

/**
 * Everything about an article the search bar can match, as one lowered string.
 *
 * Exactly the four things the decided spec names — title, authors, tags, and
 * reading status (research/ui-ux/pages/lit-tracker/pages/collection-view.md) —
 * and deliberately not the venue or the year, which are shown on the card but
 * are not what the spec says search is for.
 *
 * The status goes in through its **label** rather than its stored value. They
 * are the same three words today, and the point of the label map is that
 * renaming what `pending` reads as must never become a migration; a reader
 * searching for what they can see on the card would otherwise find nothing the
 * day those two diverge.
 *
 * Every part is a string that is definitely present — the title is `not null`,
 * and an author with no name or an article with no tags contributes nothing
 * rather than a gap. That is what keeps a missing field from matching every
 * query, which is what joining `null` into a haystack quietly does.
 */
function searchableText(
  article: FilterableArticle,
  tags: readonly CollectionTag[],
): string {
  const status = article.status ?? 'pending'

  return [
    article.title,
    ...article.authors.map((author) => author.name),
    ...tags.map((tag) => tag.name),
    ARTICLE_STATUS_LABELS[status],
  ]
    .join(' ')
    .toLowerCase()
}
