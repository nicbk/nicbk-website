import { createFileRoute } from '@tanstack/react-router'
import { ArticleDetailPage } from './-article-detail/article-detail-page'
import {
  articleSearchSchema,
  articleViewOf,
  useSetArticleView,
} from './-article-detail/article-view'

/**
 * `/lit-tracker/<article id>` — one paper: its metadata, its reader, and the
 * sidebar of things the reader keeps about it.
 *
 * **No loader.** Every other dynamic route on this site resolves its subject
 * server-side and throws `notFound()` for an unknown one; this article arrives
 * by sync instead, so at the moment the route matches there is nothing to
 * resolve — the row may be in the client's local copy already, may be seconds
 * away, or may not exist. "Not found" is therefore a state the page renders once
 * its query is *complete* and empty, rather than a throw the router turns into a
 * 404 (see `article-detail-page.tsx`).
 *
 * The guard, the header, the app shell, and the Zero client all come from the
 * group layout in `route.tsx`, which also decides what the sidebar rail shows on
 * this route.
 *
 * **`?view=citations`** swaps the reader for the citations view. Validated here,
 * on the article route rather than the group root, because no other tracker page
 * has a view to swap; the layout still reads it, through this route's match, to
 * tell the rail's copy of the sidebar which tab is selected (`article-view.ts`).
 */
export const Route = createFileRoute('/lit-tracker/$articleId')({
  validateSearch: articleSearchSchema,
  component: ArticleDetailRoute,
})

function ArticleDetailRoute() {
  const { articleId } = Route.useParams()
  const search = Route.useSearch()
  const setView = useSetArticleView(articleId)
  return (
    <ArticleDetailPage
      articleId={articleId}
      view={articleViewOf(search)}
      onViewChange={setView}
    />
  )
}
