import { MDXProvider } from '@mdx-js/react'
import { Link } from '@tanstack/react-router'
import { type ComponentType, Suspense } from 'react'
import { formatPostDate, isoDate } from '../../-utils/format-date'
import { BlogImage } from '../blog-image/blog-image'
import { Callout } from '../callout/callout'
import { PostTags } from '../post-tags/post-tags'
import styles from './blog-post-page.module.css'
import { type Frontmatter } from '~blog/frontmatter-schema'

/**
 * The global MDX components: `<Callout>` usable with no import, and every image
 * routed through BlogImage. Provided via context (MDXProvider) because the MDX
 * pipeline is configured with `providerImportSource: '@mdx-js/react'`.
 */
const mdxComponents = {
  Callout,
  img: BlogImage,
}

interface BlogPostPageProps {
  frontmatter: Frontmatter
  /** The compiled MDX component (the post's default export). */
  Content: ComponentType
}

/**
 * Renders one blog post: a header block (title, date, optional "updated", tags,
 * and a back-to-list link) followed by the MDX body in a readable max-width
 * prose column. Purely presentational — it takes already-validated frontmatter
 * and the compiled component, so the route wires data and this stays testable
 * with a fixture.
 *
 * The single <h1> is the client-navigation focus-handoff target
 * (src/focus-handoff.ts). The body is wrapped in Suspense because the route
 * hands in a lazily-loaded (code-split) component; with a synchronous component
 * (e.g. a test fixture) the boundary is simply inert.
 */
export function BlogPostPage({ frontmatter, Content }: BlogPostPageProps) {
  return (
    <article className={styles.post}>
      <header className={styles.header}>
        <h1 className={styles.title}>{frontmatter.title}</h1>
        <p className={styles.meta}>
          <time dateTime={isoDate(frontmatter.date)}>
            {formatPostDate(frontmatter.date)}
          </time>
          {frontmatter.updated !== undefined && (
            <>
              {' · updated '}
              <time dateTime={isoDate(frontmatter.updated)}>
                {formatPostDate(frontmatter.updated)}
              </time>
            </>
          )}
        </p>
        <PostTags tags={frontmatter.tags} />
        <p className={styles.back}>
          <Link to="/blog">← back to blog list</Link>
        </p>
      </header>
      <div className={styles.prose}>
        <MDXProvider components={mdxComponents}>
          <Suspense fallback={null}>
            <Content />
          </Suspense>
        </MDXProvider>
      </div>
    </article>
  )
}
