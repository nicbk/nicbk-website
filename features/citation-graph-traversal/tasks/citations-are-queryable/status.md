# Status: Citations Are Queryable

**State:** Complete ([#203](https://github.com/nicbk/nicbk-website/issues/203); merged in [#210](https://github.com/nicbk/nicbk-website/pull/210)).

## What shipped

`queries.citationEdges.references(articleId)` and
`queries.citationEdges.citedBy(articleId)`:

- Owner-scoped on the edge, and again on the related article (`citedArticle` /
  `citingArticle`) inside its subquery.
- Ordered by edge id, which is the paper's own reference order: the ids are
  UUIDv7s generated in parse order.
- Anonymous requests return nothing, and an argument that is not a UUID is
  refused.

These are the first queries on this site to use Zero's `related()`.

## Verified

- **Unit (AST).** Each query has:
  - both filters, and the related subquery's own owner filter;
  - the order;
  - UUID validation;
  - `limit(0)` without a context.
- **Integration (real Postgres, server-side ZQL).**
  - References come back in order, with the in-collection article attached, and
    the outside one carries its printed text.
  - Cited-by comes back with the citing article.
  - Another user's paper returns nothing in either direction, while that user
    sees their own.
  - An edge **planted** to point at another account's article comes back
    without that article.
  - Anonymous requests return nothing.
- **Mutation checks.** Each of these breaks fails a test:
  - dropping the edge owner filter from each query;
  - dropping the related-article owner filter from each.

A missing related row comes back as `null` from server-side ZQL, where the
client gives `undefined`. The view must treat both as "not in the collection".

## Log

- 2026-09-14 — Spec'd.
- 2026-09-15 — Implemented.
- 2026-09-15 — #210 merged.
