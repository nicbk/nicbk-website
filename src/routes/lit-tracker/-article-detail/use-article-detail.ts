import type { QueryResultDetails } from '@rocicorp/zero'
import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import type { CollectionTag } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { queries } from '~/zero/queries'
import { NO_TAGS, tagsByArticle } from '../-collection-page/article-tags'
import type { DetailArticle } from './article-summary'

/** The three states this page can be in, as everything below it needs them. */
export type ArticleDetailState = 'syncing' | 'ready' | 'missing' | 'error'

export interface ArticleDetail {
  state: ArticleDetailState
  /** The article, once `state` is `'ready'`. */
  article: DetailArticle | undefined
  /** This article's own tags. */
  tags: readonly CollectionTag[]
  /** Every tag the reader has, for the tag controls' checklist. */
  allTags: readonly CollectionTag[]
}

/**
 * One article and its tags, from sync.
 *
 * **Called twice on this page, deliberately.** The sidebar renders in the
 * shell's rail — beside the page rather than inside it — so there is no prop
 * path from the page to it, exactly as there is none from the collection page to
 * the filter rail. Both callers ask Zero the same questions, and Zero keys its
 * materialized views by query hash, so the second caller costs a subscription
 * rather than a round trip. This is the same arrangement `useCollectionFilters`
 * already lives with, and it is why this hook holds no state of its own: two
 * copies of state would be two answers, but two copies of a query are one.
 *
 * **`'missing'` is a state, not an error.** `queries.articles.byId` filters by
 * owner *as well as* id, so an article belonging to someone else comes back
 * empty in exactly the way one that does not exist does — which is the point,
 * and is what keeps another user's ids from being enumerable through this page.
 * The distinction that does matter is against `'syncing'`: an empty result
 * before the first round trip completes says nothing at all, and drawing "not
 * found" there would flash it on every cold load of a real article.
 */
export function useArticleDetail(articleId: string): ArticleDetail {
  const [articles, details] = useQuery(queries.articles.byId(articleId))
  const [allTags] = useQuery(queries.tags.mine())
  const [appliedTags] = useQuery(queries.articleTags.mine())

  const article = articles.at(0)

  // The whole join for one article's worth of answer, because that is the
  // shared helper and a second, article-scoped version of it is a second place
  // for tag ordering to be decided.
  const tagsForArticle = useMemo(
    () => tagsByArticle(appliedTags, allTags),
    [appliedTags, allTags],
  )

  return {
    state: detailState(details, article !== undefined),
    article,
    tags: tagsForArticle.get(articleId) ?? NO_TAGS,
    allTags,
  }
}

/**
 * Zero's per-query result type plus "did a row come back", as the four states
 * the page draws.
 *
 * `'unknown'` means the query has not finished its first round trip, so the
 * absence of a row is not yet evidence of anything.
 */
function detailState(
  details: QueryResultDetails,
  found: boolean,
): ArticleDetailState {
  switch (details.type) {
    case 'complete':
      return found ? 'ready' : 'missing'
    case 'error':
      return 'error'
    case 'unknown':
      return 'syncing'
  }
}
