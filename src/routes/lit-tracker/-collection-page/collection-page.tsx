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
 * The surface is filling in one task at a time: #7 gave it the toolbar and a
 * plain list, and #8's first task made the list a card grid. Still absent —
 * tags and the card menu, the filter rail, and search — are #8's remaining
 * three, each of which changes what this page renders without changing how it
 * asks for it.
 */
export function CollectionPage() {
  const [articles, details] = useQuery(queries.articles.mine())

  return (
    <div className={styles.page}>
      {/*
        The page's <h1> and the route-change focus-handoff target
        (src/focus-handoff.ts), deliberately not drawn.

        The decided layout has no page title: the main panel opens with the
        search row, and the header already says "Literature Tracker". A visible
        "collection" heading was an addition, and it pushed the toolbar and the
        articles into three separately-aligned bands. Clipped rather than
        removed, because the landmark structure and the focus handoff both need
        a heading to exist.
      */}
      <h1 className={styles.title}>collection</h1>

      {/* Above the collection and outside its loading states: uploading does
          not depend on the article query having landed, and hiding the "+"
          while the first sync is in flight would make the page look broken. */}
      <CollectionToolbar />

      <ArticleCollection articles={articles} state={collectionState(details)} />
    </div>
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
