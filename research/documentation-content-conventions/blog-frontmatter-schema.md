# Blog Frontmatter Schema

Researched: 2026-07-05. Decided: 2026-07-05.

What frontmatter fields every blog post MDX file must/may declare, and how
malformed frontmatter is caught, building on the already-decided
[../technologies/mdx-rendering.md](../technologies/mdx-rendering.md) (
`remark-frontmatter` + `remark-mdx-frontmatter`, which turns a post's YAML
frontmatter into a plain `export const frontmatter = {...}` object rather
than needing a separate parsing step).

## Decision

- **Required fields:** `title` (string), `date` (the publish date — single
  source of truth for chronological ordering; see
  [blog-content-structure-and-naming.md](./blog-content-structure-and-naming.md)
  for why this means filenames are not date-prefixed), `description`
  (string — used for both the blog list page's preview text and SEO meta
  description).
- **Optional fields:** `updated` (last-substantial-edit date, shown
  alongside `date` only when present), `tags` (string array), `draft`
  (boolean, defaults to `false` — a `true` post is excluded from the
  production blog list/build output), `coverImage` (path to a co-located
  image, used for social-share/OG previews).
- **Explicitly omitted: `author`.** This is a single-author personal blog
  (see [DESIGN.md](../../high-level-guidance/design/DESIGN.md)) — an author
  field would be a static, always-identical value repeated in every post,
  which is duplication with no reader benefit.
- **`slug` is not a frontmatter field.** The slug is derived from the post's
  folder/file name (see
  [blog-content-structure-and-naming.md](./blog-content-structure-and-naming.md)),
  keeping one source of truth for the URL instead of two fields that could
  drift out of sync.
- **Explicitly omitted: `license`/`copyright`.** All blog content is under a
  single uniform CC BY 4.0 license, expressed once as a root `LICENSE`/README
  carve-out — see
  [../licensing/blog-and-content-licensing.md](../licensing/blog-and-content-licensing.md).
  A per-post license field would repeat an identical value in every post
  (the same duplication reasoning that omits `author` above), so it is
  deliberately not part of this schema. This is the resolution of the
  frontmatter-vs-carve-out choice that the licensing doc left open to this
  category.
- **Validation: a Zod schema applied to the `frontmatter` export at build
  time.** Every MDX post module's `frontmatter` export is parsed against a
  shared Zod schema (e.g. in a `blog/frontmatter-schema.ts`) before the post
  is included in any page — a build fails loudly on a missing `title` or a
  malformed `date` rather than rendering a broken card on the blog list
  page. The Zod schema is also the single source for the frontmatter
  TypeScript type (via `z.infer`), so the shape is defined once, not
  separately typed and separately validated.

## Reasoning

- Keeping the required-field list minimal (`title`, `date`, `description`)
  follows the project's general low-friction/avoid-overcomplicating design
  philosophy (see [../ui-ux/design-system.md](../ui-ux/design-system.md)) —
  every additional required field is friction on writing a post, so fields
  are optional unless the blog list page or SEO meta genuinely needs them
  unconditionally.
- Deriving the slug from the filename/folder name rather than a frontmatter
  field avoids the two-sources-of-truth problem explicitly (a frontmatter
  `slug` that no longer matches its folder name after a rename is a silent
  broken-link risk); the file/folder name is already unique and already has
  to exist, so it's the natural single source.
- A Zod schema (rather than hand-written `if` checks, or no validation at
  all) was chosen because this is already a TypeScript project — Zod gives
  runtime validation and the compile-time type from the same declaration,
  matching how e.g. Astro's Content Collections validate frontmatter, and
  fitting the existing pattern of catching problems at build time rather
  than at runtime in production (same instinct as the pre-commit-hook-plus-
  CI enforcement in
  [../coding-conventions/formatting-and-linting.md](../coding-conventions/formatting-and-linting.md)).
  A JSON-Schema-via-remark-lint alternative was considered
  (`remark-lint-frontmatter-schema`) but is less idiomatic here since it
  doesn't give free TypeScript inference the way a Zod schema does.

## Sources

- [MDX official frontmatter guide](https://mdxjs.com/guides/frontmatter/) —
  baseline frontmatter mechanics for MDX.
- [devportals.tech — MDX Frontmatter Reference](https://devportals.tech/markup/mdx-frontmatter/) —
  common field conventions (title/date/description/tags/draft) and the
  "start minimal, don't add unused fields" guidance.
- [HiDeoo/zod-matter](https://github.com/HiDeoo/zod-matter) — a purpose-built
  "typesafe front matter" library demonstrating the Zod-over-frontmatter
  pattern this decision follows.
- [Astro — Content Collections](https://docs.astro.build/en/guides/content-collections/) —
  prior art for validating MDX/Markdown frontmatter against a Zod schema at
  build time.
- [remcohaszing/remark-mdx-frontmatter](https://github.com/remcohaszing/remark-mdx-frontmatter) —
  confirms frontmatter is exposed as a plain JS object export, which a Zod
  `.parse()` call consumes directly.
- [JulianCataldo/remark-lint-frontmatter-schema](https://github.com/JulianCataldo/remark-lint-frontmatter-schema) —
  the JSON-Schema-based alternative considered and not chosen.
