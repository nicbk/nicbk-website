import { z } from 'zod'

/**
 * The single source of truth for a blog post's frontmatter shape.
 *
 * Every post's `index.mdx` declares YAML frontmatter that
 * `remark-mdx-frontmatter` turns into a plain `export const frontmatter`.
 * That raw object is validated against this schema at build/SSR time (see
 * `parseFrontmatter`), so a post with a missing required field or a malformed
 * date fails loudly instead of rendering a broken row/page. The TypeScript
 * `Frontmatter` type is inferred from the schema (`z.infer`) rather than
 * declared separately, keeping the runtime contract and the compile-time type
 * in lockstep.
 *
 * Deliberately absent: `author`, `slug`, and `license`. The blog is
 * single-author, the slug is the post's folder name, and content licensing is
 * the one root `LICENSE` CC BY 4.0 carve-out — none of which should be
 * repeated in every post's frontmatter (see
 * research/documentation-content-conventions/blog-frontmatter-schema.md and
 * research/licensing/blog-and-content-licensing.md).
 */
export const frontmatterSchema = z.object({
  /** Post title — the page <h1> and the list row's linked title. */
  title: z.string().min(1),
  /**
   * Publish date, the single source of chronological ordering. `z.coerce.date`
   * accepts both a quoted string and the JS `Date` that a YAML parser yields
   * for an unquoted ISO date, and rejects an unparseable value (Invalid Date),
   * so a malformed date fails validation at build time.
   */
  date: z.coerce.date(),
  /** One-line summary — the list row description and the meta description. */
  description: z.string().min(1),
  /** Last-updated date; shown in the post header only when present. */
  updated: z.coerce.date().optional(),
  /** Inline tags; defaults to an empty list so consumers never handle undefined. */
  tags: z.array(z.string()).default([]),
  /** Excludes the post from the production list/build when true. */
  draft: z.boolean().default(false),
  /** Optional path to a cover image, used for the Open Graph image tag. */
  coverImage: z.string().optional(),
})

/**
 * A post's validated frontmatter. Note the parsed shape: `date`/`updated` are
 * `Date` objects and `tags`/`draft` are always present (defaulted), even
 * though `tags`/`draft`/`updated`/`coverImage` are optional in the source
 * YAML.
 */
export type Frontmatter = z.infer<typeof frontmatterSchema>

/**
 * Validate a post module's raw `frontmatter` export against the schema,
 * throwing a message that names the offending post so a bad post is easy to
 * find in a failing build. `slug` is the post's folder name, used only for
 * that error message.
 */
export function parseFrontmatter(raw: unknown, slug: string): Frontmatter {
  const result = frontmatterSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in blog post "${slug}": ${result.error.message}`,
    )
  }
  return result.data
}
