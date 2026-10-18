# Research: Technologies

Status: all 10 topics researched and decided (9/9 on 2026-07-02; `orm.md`
added 2026-07-05); `payment-processor.md` researched 2026-10-14, awaiting
decision. See each topic file for the chosen option, reasoning,
and open items carried to other categories.

What technologies/services to use, evaluated against the open-source and
shared-infrastructure constraints in
[DESIGN.md](../../high-level-guidance/design/DESIGN.md).

## Shared infrastructure

- [sync-engine.md](./sync-engine.md) — Reactive sync engine / live-update
  layer. **Decision: Zero (Rocicorp).**
- [database.md](./database.md) — Backend database. **Decision: PostgreSQL**
  (settled by sync-engine choice).
- [blob-storage.md](./blob-storage.md) — Blob storage. **Decision: Garage**
  (MinIO OSS discontinued/archived, no longer viable).
- [auth.md](./auth.md) — Auth. **Decision: Better Auth**, configured with
  Google as the social/OAuth provider.
- [frontend-framework.md](./frontend-framework.md) — Frontend
  meta-framework. **Decision: TanStack Start.**
- [mdx-rendering.md](./mdx-rendering.md) — MDX blog rendering approach.
  **Decision: `@mdx-js/rollup`** with `remark-frontmatter` +
  `remark-mdx-frontmatter`.
- [orm.md](./orm.md) — ORM/migration tooling. **Decision: Drizzle** (Drizzle
  Kit + the official `drizzle-zero` generator), settled in
  [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md).
- [payment-processor.md](./payment-processor.md) — Payment processor for the
  $5/month paid role. Researched 2026-10-14; awaiting decision.
  Recommendation: Polar (merchant of record) via its Better Auth plugin,
  Stripe Billing as fallback; needs an open-source exception.

## Lit Tracker specific

- [pdf-metadata-extraction.md](./pdf-metadata-extraction.md) — PDF
  metadata/bibliography extraction. **Decision: GROBID + Semantic Scholar
  only** (Crossref excluded — arXiv coverage gap).
- [citation-graph.md](./citation-graph.md) — Citation graph modeling +
  traversal UI patterns. **Decision: simple list/breadcrumb UI**, not a
  full graph-viz canvas.
- [pdf-reader-annotations.md](./pdf-reader-annotations.md) — Open-source PDF
  reader with persisted annotations. **Decision: EmbedPDF** (headless,
  PDFium-based), chosen over the react-pdf-highlighter (PDF.js-based)
  family.
