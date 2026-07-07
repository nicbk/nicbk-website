# Status: Blog Search + Tag Filter

**State:** Not started (2026-07-06). Blocked on `blog-list-page` (filters the
list surface and its frontmatter-only listing helper) and transitively on
`mdx-pipeline-and-post-page`.

- Branch: _not yet created_ (`blog/blog-search-and-filter` when started).
- Sub-issue: [#26](https://github.com/nicbk/nicbk-website/issues/26)
  (parent [#23](https://github.com/nicbk/nicbk-website/issues/23)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- Filter state lives in **TanStack Router search params** (Zod-validated
  `validateSearch`, read via `useSearch`) — linkable/bookmarkable, not local
  state.
- **Zod 4, no `@tanstack/zod-adapter`** — pass the schema to `validateSearch`
  directly (the adapter pins Zod 3).
- Live typing must not flood history (debounce / replace-navigation) while
  keeping the final filtered view linkable and back/forward-navigable.
- Keep the filter logic a **pure, unit-testable predicate** over
  `(metadata, search params)`.
- **Responsive:** sidebar reflows below content (or a drawer) under ~768px, per
  the design-system conventions.
- This originates the search-bar + tag-sidebar style the Lit Tracker collection
  view reuses — build it to be reusable.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `blog-list-page`.
