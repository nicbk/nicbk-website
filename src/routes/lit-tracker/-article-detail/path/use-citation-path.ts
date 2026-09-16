import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import type { PathArticle, PathStep } from '~/lit-tracker/citation-path'
import { citationPath, walkedPath } from '~/lit-tracker/citation-path'
import { queries } from '~/zero/queries'

/**
 * The way back for the open paper, from sync
 * (features/citation-graph-traversal, task 5).
 *
 * **One query for the whole path** (`queries.articles.onPath`): the titles and
 * the edges that label each step arrive together, so the row appears at once
 * rather than filling in a paper at a time.
 *
 * The ids are walked *before* they are asked for, which is what bounds the
 * query: a revisit shortens the path, a cycle collapses, and at most
 * `PATH_ARTICLES_MAX` ids are ever sent, whatever the URL says.
 */
export function useCitationPath(
  articleId: string,
  via: readonly string[],
): PathStep[] {
  // Joined into a key so a fresh array with the same ids — which is what a
  // re-render of the layout hands us — does not re-run the query or rebuild the
  // steps.
  const key = walkedPath(via, articleId).join(',')
  const ids = useMemo(() => (key === '' ? [] : key.split(',')), [key])

  const [articles] = useQuery(queries.articles.onPath(ids))

  return useMemo(
    () => citationPath(ids.slice(0, -1), articleId, articles as PathArticle[]),
    [ids, articleId, articles],
  )
}
