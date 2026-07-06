# Research: Documentation & Content Conventions

Status: fully researched and decided (2026-07-05), 4/4.

Writing style/structure for project documentation (this hierarchy itself)
and for MDX blog posts (frontmatter schema, file structure, authoring
conventions).

## Topics

- [doc-formatting-conventions.md](./doc-formatting-conventions.md) —
  Decided. Formalizes the Title Case/`Researched:`+`Decided:`/`## Decision`/
  `## Reasoning`/`## Sources` structure already used across every research
  category, its ADR lineage, and Diátaxis as an explicitly out-of-scope
  framework for any future user-facing docs.
- [blog-frontmatter-schema.md](./blog-frontmatter-schema.md) — Decided.
  Required `title`/`date`/`description`, optional `updated`/`tags`/`draft`/
  `coverImage`, no `author` or `slug` field; a Zod schema validates the
  `remark-mdx-frontmatter` export at build time.
- [blog-content-structure-and-naming.md](./blog-content-structure-and-naming.md) —
  Decided. Folder-per-post (`blog/posts/<slug>/index.mdx` + co-located
  images), kebab-case slug with no date prefix, lazy `import.meta.glob`
  post discovery.
- [mdx-authoring-conventions.md](./mdx-authoring-conventions.md) — Decided.
  Build-time Shiki highlighting via `rehype-pretty-code`, a global
  `Callout` component, and `remark-lint-no-empty-image-alt-text` enforcing
  the already-decided accessibility alt-text mandate at build time.
