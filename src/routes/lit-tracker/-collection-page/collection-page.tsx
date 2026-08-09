import type { QueryResultDetails } from '@rocicorp/zero'
import { useQuery } from '@rocicorp/zero/react'
import { queries } from '~/zero/queries'
import { CollectionToolbar } from '../-components/collection-toolbar/collection-toolbar'
import type { CollectionState } from './article-collection'
import { ArticleCollection } from './article-collection'
import styles from './collection-page.module.css'

/**
 * The Lit Tracker's home surface, and the first place on this site where data
 * arrives by sync rather than by request.
 *
 * `articles.mine` is the query task 1 defined and authorized; nothing about
 * which rows come back is decided here. Calling it returns a request naming the
 * query and its arguments, which zero-cache resolves by asking
 * `/api/zero/query` for the ZQL — so this component names *what* it wants and
 * the server decides what that means for this session. A row inserted into
 * Postgres by anything at all, including a background job, reaches this list
 * the same way (research/system-architecture/reactivity-propagation.md).
 *
 * The query is built inline on every render rather than memoized: Zero keys its
 * materialized views by query hash, so the identical request resolves to the
 * identical view.
 *
 * This is still a minimal surface — no search, no tags, no filter sidebar, no
 * infinite scroll. Task 3 added the toolbar above the list; the full collection
 * view is #8, which builds on this page rather than replacing it.
 */
export function CollectionPage() {
  const [articles, details] = useQuery(queries.articles.mine())

  return (
    <>
      {/* The page's single visible <h1> and the route-change focus-handoff
          target (src/focus-handoff.ts). */}
      <h1 className={styles.title}>collection</h1>

      {/* Above the collection and outside its loading states: uploading does
          not depend on the article query having landed, and hiding the "+"
          while the first sync is in flight would make the page look broken. */}
      <CollectionToolbar />

      <ArticleCollection articles={articles} state={collectionState(details)} />
    </>
  )
}

/**
 * Zero's per-query result type, as the three states this page draws.
 *
 * `'unknown'` means the query has not finished its first round trip — the rows
 * in hand may be a partial local view, or nothing at all. Treating it as
 * `'ready'` would render "no articles yet." at an account that has plenty.
 */
function collectionState(details: QueryResultDetails): CollectionState {
  switch (details.type) {
    case 'complete':
      return 'ready'
    case 'error':
      return 'error'
    case 'unknown':
      return 'syncing'
  }
}
