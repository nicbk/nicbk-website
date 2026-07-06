# MDX Blog Rendering

Researched: 2026-07-02. Decided: 2026-07-02.

## Decision

**`@mdx-js/rollup`** integrated into the Vite build pipeline, since the
project is on TanStack Start (see
[frontend-framework.md](./frontend-framework.md)) rather than Next.js.
Frontmatter (title/date/etc. for the blog list page) is handled via
**`remark-frontmatter` + `remark-mdx-frontmatter`**, chosen over
`gray-matter`, so frontmatter becomes an exported value directly from each
MDX module rather than needing a separate parsing step.

Per [DESIGN.md](../../high-level-guidance/design/DESIGN.md), blog posts are
MDX files committed directly into the project source, structured under a
blog subfolder.

## Findings

- **Next.js**: `@next/mdx` transforms MDX into components, including
  Server Component support in the App Router. It does **not** support
  frontmatter out of the box — needs an added solution (e.g. a remark
  frontmatter plugin, or a content-collection layer) to extract metadata
  like title/date for list pages. A common pattern: MDX files live under
  `/content/posts` and are dynamically imported at build/runtime. Global
  MDX components are customized via a root `mdx-components.tsx` file.
  Rendering MDX via Server Components avoids shipping the MDX JS runtime
  to the client.
- **Vite (non-Next.js) projects**: the `@mdx-js/rollup` plugin integrates
  MDX directly into Vite's build pipeline — relevant if
  [frontend-framework.md](./frontend-framework.md) lands on TanStack Start
  or plain Vite instead of Next.js.

## Notes for later planning

- Frontmatter handling needs an explicit decision regardless of framework
  choice (a remark plugin, gray-matter, or a content-collection tool) since
  neither Next.js nor plain MDX handles it natively.
- This choice is downstream of [frontend-framework.md](./frontend-framework.md)
  — Next.js vs. TanStack Start/Vite changes which MDX integration path
  applies.

## Sources

- [Guides: MDX | Next.js](https://nextjs.org/docs/app/guides/mdx)
- [Building a Modern Blog with MDX and Next.js 16](https://www.mdxblog.io/code/building-a-modern-blog-with-mdx-and-nextjs-16)
- [A Powerful Combination of Markdown and MDX in Next.js for CMS](https://staticmania.com/blog/markdown-and-mdx-in-next.js-a-powerful-combination-for-content-management)
- [MDX Complete Guide: Markdown + JSX for Developers](https://chanhle.dev/en/blog/mdx-complete-guide)
