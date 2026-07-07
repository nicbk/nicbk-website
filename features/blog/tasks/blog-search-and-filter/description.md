# Task: Blog Search + Tag Filter

Add live search and sidebar tag filtering over the blog list, with the active
query held in URL search params, per
[blog-list.md](../../../../research/ui-ux/pages/site-wide/pages/blog-list.md)
and
[state-management-conventions.md](../../../../research/coding-conventions/state-management-conventions.md).
This **originates** the search-bar + tag-sidebar style the Lit Tracker's
collection view later reuses.

## What this task does — concretely

- **URL search-param state.** Add a Zod-validated `validateSearch` to the
  `/blog` route capturing the search text and the selected tag(s); read it via
  the typed `useSearch()` hook. Because the repo is on Zod 4, the schema is
  passed to `validateSearch` **directly** (not through `@tanstack/zod-adapter`,
  which pins Zod 3 — see the parent
  [research.md](../../research.md) note). Filter state is therefore linkable,
  bookmarkable, and survives refresh and back/forward — not local `useState`.
- **Search bar.** A live-as-you-type text input (a colocated component, Base UI
  primitive where useful, styled from tokens) that filters the list by matching
  post **title, description, and tags**. Typing updates the search param
  (debounced/replace-navigation as appropriate so history isn't spammed).
- **Tag-filter sidebar.** A sidebar listing the tags present across posts as
  **toggleable filter controls** (multi-select); selecting tags narrows the
  list to posts carrying them. Each control is keyboard operable and conveys its
  pressed/selected state. This is the reusable style Lit Tracker inherits.
- **Combined filtering.** The list shows posts matching the search text **and**
  the selected tags, still newest-first; a pure predicate/helper computes the
  filtered set from the metadata list + the current search params.
- **Responsive layout.** Per the design-system responsive conventions, the
  sidebar sits alongside the list on wider viewports and **reflows below the
  list content (or a toggleable drawer)** under the ~768px breakpoint (media
  query at the page level).
- **Empty results.** When search/filter matches nothing, render the plain-text
  empty state (distinct wording from "no posts exist" if helpful), consistent
  with the design system's reactive-feedback default.

## Not in this task

- The base list rendering, ordering, infinite scroll, and draft exclusion
  (task 2) — this task filters the list task's surface.
- The post page and the MDX pipeline (task 1).
- Persisting filter state anywhere other than the URL (no server, no
  localStorage).
