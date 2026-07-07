import { createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, useMemo } from 'react'
import { BlogPostPage } from './-components/blog-post-page/blog-post-page'
import { loadPostFrontmatter } from './-lib/load-post'
import { postHeadMeta } from './-utils/post-head'
import { getPostContentLoader } from '~blog/posts'

/**
 * The individual blog post route, `/blog/<slug>`.
 *
 * The loader returns only the post's validated frontmatter — serializable data
 * safe to hydrate — and throws `notFound()` for an unknown slug, which the root
 * route's notFoundComponent turns into a real HTTP 404. The compiled MDX body
 * is loaded separately in the component via `React.lazy` over the per-post glob
 * entry, so each post stays in its own code-split chunk (the body is never
 * bundled with the loader data or with other posts).
 *
 * This is the app's first route `loader` and first per-page `head()`; both
 * bodies are thin wrappers over tested helpers (`-lib`/`-utils`).
 */
export const Route = createFileRoute('/(personal-site)/blog/$slug')({
  loader: ({ params: { slug } }) => loadPostFrontmatter(slug),
  head: ({ loaderData }) =>
    // loaderData is undefined while the loader is pending / on a not-found match.
    loaderData === undefined
      ? {}
      : { meta: postHeadMeta(loaderData.frontmatter) },
  component: BlogPostRoute,
})

function BlogPostRoute() {
  const { slug } = Route.useParams()
  const { frontmatter } = Route.useLoaderData()
  // Memoize the lazy component per slug so navigating between posts swaps the
  // body without recreating it on every render.
  const Content = useMemo(() => {
    const load = getPostContentLoader(slug)
    if (load === null) {
      // Unreachable in practice (the loader 404s first), but keeps the type
      // honest and degrades to the not-found treatment rather than crashing.
      throw notFound()
    }
    return lazy(load)
  }, [slug])

  return <BlogPostPage frontmatter={frontmatter} Content={Content} />
}
