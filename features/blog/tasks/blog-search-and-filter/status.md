# Status: Blog Search + Tag Filter

**State:** Implemented, awaiting PR + CI + review (2026-07-17). Built on
`blog-list-page` (merged #39) and `mdx-pipeline-and-post-page` (merged #37).

- Branch: `blog/blog-search-and-filter` (off `main` at `88b4e96`).
- Sub-issue: [#26](https://github.com/nicbk/nicbk-website/issues/26)
  (parent [#23](https://github.com/nicbk/nicbk-website/issues/23)).
- PR / CI / review: _pending._

## What was implemented

- **URL search-param state.** `/blog` gains a Zod 4 `validateSearch`
  (`-list-page/search-schema.ts`) capturing `q` (text) and `tags` (string[]),
  passed **directly** (no `@tanstack/zod-adapter`). Read/updated through
  `-list-page/use-blog-filters.ts` (`getRouteApi(...).useSearch()` +
  `useNavigate()`), so a filtered view is linkable, bookmarkable, and survives
  refresh/back-forward — not local state.
- **Search bar** (`-list-page/search-bar/`): a native `<input type="search">`
  with a visually-hidden label. Local input state + 250 ms debounce pushes the
  query with **replace** navigation (keystrokes don't flood history); a sync
  effect adopts external `q` changes (shared link, back/forward).
- **Tag sidebar** (`-list-page/tag-filter/`): native `<button aria-pressed>`
  toggles, one per tag (`collectTags`). Pressed state shown by color **and**
  weight (not color alone). Toggling **pushes** history, so back/forward steps
  through tag states. Originates the reusable search + tag-sidebar style for the
  Lit Tracker.
- **Pure filtering** (`-utils/filter-posts.ts`): `filterPosts(posts, {q, tags})`
  — case-insensitive substring over title/description/tags, AND-composed with
  the selected tags, preserving newest-first order.
- **Layout** (`-list-page/list-page.module.css`): DOM order search → sidebar →
  list (a11y focus order); wide viewports place list left / sidebar right via
  `grid-template-areas`, narrow (<48rem) stacks search → tags → list.
- **No-match state:** plain "No posts match your search." (distinct from the
  "No posts yet." empty state), with the search/sidebar kept rendered.

## Decisions (confirmed with the user)

- **Multiple tags = AND** (post must carry all selected tags) — matches the
  spec's "narrows" wording and the "AND-composed" acceptance criterion.
- **Mobile: tags wrap above the list** (a horizontal row between search and
  list), not a drawer and not below the list. A minor, deliberate deviation from
  the spec's literal "reflows below the list content" — keeps the a11y focus
  order (search → tags → list) and avoids a stateful drawer, per the minimalist
  design philosophy. The spec's drawer alternative was the fallback.
- **Native elements, not Base UI**, for the input and toggles — the platform
  controls already give correct semantics/keyboard/pressed-state, matching the
  theme toggle's native-first reasoning.

## Implementation notes

- **Schema uses `.optional().catch(undefined)`, not `.default(...)`.** A
  defaulted field validates a bare `/blog` (and every `<Link to="/blog">`, e.g.
  the post page's "back to blog list") into `{ q:'', tags:[] }`, which the router
  then serializes back as `?q=&tags=%5B%5D` — polluting all plain list links
  (this regressed an existing post-page e2e until fixed). Absent filters stay
  `undefined` (omitted from the URL); `useBlogFilters` normalizes to `''`/`[]`.
  A `preprocess` step lifts a lone hand-typed `?tags=react` (a bare string) into
  `['react']`.
- Tag button accessible names include the decorative `#` (a CSS `::before`
  Chromium folds into the accname) — a discernible name either way; e2e uses
  substring matching.

## Verification

- `npm run typecheck` ✓; Biome ✓; **153 unit tests** ✓ (incl. `filter-posts`,
  `collectTags`, `search-schema`, `SearchBar`, `TagFilter`, and ListPage
  filtering/no-match integration).
- **44 Playwright e2e** ✓ (production build), incl. the new search/tag block:
  URL round-trip, pre-filtered link + reload, history hygiene (tag push vs.
  typing replace), mobile operability, and axe with a tag selected in both
  themes.
- Chrome visual check at 1280px and 500px, both themes: sidebar-right/list-left
  on wide, tags-above-list on narrow, tag + search filtering, pressed state, and
  the `:focus-visible` ring on the search field and tag toggles.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `blog-list-page`.
- 2026-07-17 — Implemented on `blog/blog-search-and-filter`. Search-param state,
  search bar, tag sidebar, pure filter, responsive layout, no-match state; full
  unit + e2e + Chrome verification green. Awaiting PR + CI + review.
