import { useQuery } from '@rocicorp/zero/react'
import { queries } from '~/zero/queries'
import type { ContentsView } from './contents-view'
import { contentsView } from './contents-view'

/**
 * This paper's contents, from sync, as the tab should show them.
 *
 * The row arrives by sync like every other piece of the article
 * (`article_contents` is in the `zero_data` publication), so a paper read while
 * its page is open fills the tab in place — the backfill, or an upload that
 * finishes with the paper already showing.
 */
export function useArticleContents(
  articleId: string,
  extractionStatus: string | null | undefined,
): ContentsView {
  const [rows, details] = useQuery(
    queries.articleContents.forArticle(articleId),
  )
  return contentsView(
    details.type === 'complete'
      ? 'ready'
      : details.type === 'error'
        ? 'error'
        : 'syncing',
    rows.at(0),
    extractionStatus,
  )
}
