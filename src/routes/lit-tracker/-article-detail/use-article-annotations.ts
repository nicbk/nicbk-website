import { useQuery } from '@rocicorp/zero/react'
import { queries } from '~/zero/queries'
import type { SyncedAnnotation } from './reader/annotation-sync/annotation-row'

/**
 * Empty-and-syncing and empty-and-really-empty are different sentences, so the
 * distinction the list draws is a state, not an inference.
 */
export type ArticleAnnotationsState = 'syncing' | 'ready' | 'error'

export interface ArticleAnnotations {
  state: ArticleAnnotationsState
  /** In the query's decided order: by page, then by creation time. */
  annotations: readonly SyncedAnnotation[]
}

/**
 * This article's marks, from sync, for the sidebar's list.
 *
 * The **same query the reader's sync bridge holds open**
 * (`annotations.forArticle` — see `reader/annotation-sync/use-annotation-sync.ts`),
 * asked again rather than threaded across the tree: Zero keys its materialized
 * views by query hash, so this costs a second subscription to one view, not a
 * second round trip — the arrangement every rail-and-page pair on this site
 * already lives with (`use-article-detail.ts`). It is also what makes the list
 * live in both directions for free: the delivery that puts a mark on the paper
 * is the delivery that puts its row here.
 *
 * The ordering is deliberately not re-sorted here. The query sorts by
 * `pageIndex` then `createdAt` *for this list* (its own comment says so), and a
 * second sort would be a second place for the decision to live.
 */
export function useArticleAnnotations(articleId: string): ArticleAnnotations {
  const [rows, details] = useQuery(queries.annotations.forArticle(articleId))

  return {
    state:
      details.type === 'complete'
        ? 'ready'
        : details.type === 'error'
          ? 'error'
          : 'syncing',
    annotations: rows,
  }
}
