# Constraints and Behavior: Blog Search + Tag Filter

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md) — the
"Search and tag filtering" section, plus the cross-cutting quality bar):

- A **search bar** filters the list live-as-you-type, matching post **title,
  description, and tags**.
- A **sidebar of toggleable tag filters** narrows the list to posts carrying the
  selected tag(s); multiple tags are multi-select.
- Search text and selected tags live in **TanStack Router search params**
  (Zod-validated via `validateSearch`, read via `useSearch`) — a
  filtered/searched view is **linkable, bookmarkable, and survives refresh and
  back/forward**. Filter state is **not** local component state.
- Combined search + tag filtering is **AND**-composed and preserves the
  newest-first ordering.
- The tag sidebar is **responsive**: alongside the list on wider viewports,
  reflowed below the content (or a toggleable drawer) under the mobile
  breakpoint, per the design-system responsive conventions.
- **No-match state:** plain inline text (no illustration, no spinner).
- This is the originating implementation of the search-bar + tag-sidebar style
  the Lit Tracker collection view reuses.

## Behavior details

- **Zod 4, no adapter:** the `validateSearch` schema is passed directly (the
  `@tanstack/zod-adapter` Zod-3 pin is avoided) — resolving the caveat flagged
  in `state-management-conventions.md`.
- **History hygiene:** live typing updates the search param without flooding the
  history stack (replace-style navigation / debounce), while still leaving the
  final filtered view linkable and back/forward-navigable.
- **Pure filter logic:** a testable pure predicate computes the visible set from
  `(metadata list, search params)` — no side effects, no data fetch.
- Identical under `npm run dev` and the production Nitro server.

## Dependencies

- **`blog-list-page`** — provides the rendered list surface and the
  frontmatter-only listing helper this task filters over.
- **`mdx-pipeline-and-post-page`** — the frontmatter schema/type and data layer
  underneath.
- TanStack Router search-param APIs (already present) and Zod 4 (already a
  project dependency).

## Provides to later work

- The reusable search-bar + toggleable-tag-sidebar pattern and its
  URL-search-param wiring, which the Lit Tracker's collection view (Phase 3)
  reuses rather than reinvents.
