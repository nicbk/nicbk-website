import { createFileRoute } from '@tanstack/react-router'
import { loadPostListing } from './-lib/load-listing'
import { ListPage } from './-list-page/list-page'

/**
 * The `/blog` index route: the reverse-chronological post list.
 *
 * The loader reads every post's frontmatter (metadata only — no bodies bundled),
 * excludes drafts in the production build, and orders newest-first; the returned
 * data is serializable, so the list server-renders. `head()` sets the page's own
 * document title and meta description (the root default title is reused, per the
 * task's "sets its own <title>").
 */
export const Route = createFileRoute('/(personal-site)/blog/')({
  loader: () => loadPostListing(),
  head: () => ({
    meta: [
      { title: 'Nicolás Kennedy' },
      { name: 'description', content: 'blog posts' },
    ],
  }),
  component: BlogListRoute,
})

function BlogListRoute() {
  const { posts } = Route.useLoaderData()
  return <ListPage posts={posts} />
}
