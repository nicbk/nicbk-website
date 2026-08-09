import type { ArticleStatus } from '~/lit-tracker/article-status'
import type { CollectionTag } from './article-card/article-menu/article-menu'

/** The fields filtering needs from an article; the card needs many more. */
interface FilterableArticle {
  id: string
  status: ArticleStatus | null
}

/** The active filters, as `useCollectionFilters` reports them. */
export interface CollectionFilters {
  /** Tag names; an article must carry ALL of them (AND-composed). */
  tags: readonly string[]
  /** The one reading status to keep, or `undefined` for any. */
  status: ArticleStatus | undefined
}

/**
 * Narrow the collection to the articles matching every active filter,
 * preserving the input order (the caller passes it already newest-first).
 *
 * - **Tags are AND-composed**: an article must carry every selected tag. No
 *   selected tags matches everything. This is the thing most easily got
 *   backwards, and the mistake is invisible until a reader selects two — hence
 *   the test written first and this sentence.
 * - **Status** matches the article's own column exactly. An article with no
 *   status is treated as `pending`, the same reading the card takes, so a row
 *   whose column has not been written yet does not fall out of every filter.
 * - The two compose with AND — an article must satisfy both.
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
 * unit-testable with no router and no Zero client. Task 4's text search adds a
 * third clause here rather than a second filtering pass somewhere else.
 */
export function filterArticles<Article extends FilterableArticle>(
  articles: readonly Article[],
  tagsByArticle: ReadonlyMap<string, readonly CollectionTag[]>,
  filters: CollectionFilters,
): readonly Article[] {
  if (filters.tags.length === 0 && filters.status === undefined) {
    return articles
  }

  const wanted = filters.tags.map((name) => name.toLowerCase())

  return articles.filter((article) => {
    if (filters.status !== undefined) {
      if ((article.status ?? 'pending') !== filters.status) {
        return false
      }
    }

    if (wanted.length === 0) {
      return true
    }

    const carried = new Set(
      (tagsByArticle.get(article.id) ?? []).map((tag) =>
        tag.name.toLowerCase(),
      ),
    )
    return wanted.every((name) => carried.has(name))
  })
}
