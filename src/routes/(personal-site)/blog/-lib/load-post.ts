import { notFound } from '@tanstack/react-router'
import { getPostFrontmatter } from '~blog/posts'

/**
 * The blog post route's loader body: resolve a slug to its validated
 * frontmatter, or throw `notFound()` (a real 404) when no such post exists.
 * Extracted from the route so the data-access + not-found decision is
 * unit-testable without standing up a router. Returns only serializable data
 * (the frontmatter) — the compiled MDX body is loaded separately in the
 * component.
 */
export async function loadPostFrontmatter(slug: string) {
  const frontmatter = await getPostFrontmatter(slug)
  if (frontmatter === null) {
    throw notFound()
  }
  return { frontmatter }
}
