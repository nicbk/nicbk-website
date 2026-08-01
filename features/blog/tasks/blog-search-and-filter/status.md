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
- **Tag filter** (`-list-page/tag-filter/`): native `<button aria-pressed>`
  toggles, one per tag (`collectTags`). Pressed state shown by color **and**
  weight (not color alone). Toggling **pushes** history, so back/forward steps
  through tag states. Originates the reusable search + tag-filter style for the
  Lit Tracker.
- **Pure filtering** (`-utils/filter-posts.ts`): `filterPosts(posts, {q, tags})`
  — case-insensitive substring over title/description/tags, AND-composed with
  the selected tags, preserving newest-first order.
- **Layout** (`-list-page/list-page.module.css`): a single column at every
  width — search → tags → list, in DOM order (also the a11y focus order). The
  tags sit **above** the list at all widths (see the 2026-07-17 follow-up log
  entry for why a right-hand column was rejected).
- **No-match state:** plain "No posts match your search." (distinct from the
  "No posts yet." empty state), with the search/tag filter kept rendered.

## Decisions (confirmed with the user)

- **Multiple tags = AND** (post must carry all selected tags) — matches the
  spec's "narrows" wording and the "AND-composed" acceptance criterion.
- **Tags above the list at every width** (a horizontal row between search and
  list), not a drawer, not below the list, and not a right-hand column. A minor,
  deliberate deviation from the spec's literal "reflows below the list content" —
  keeps the a11y focus order (search → tags → list) and avoids a stateful drawer,
  per the minimalist design philosophy. The spec's drawer alternative was the
  fallback. (The initial implementation used a right-hand sidebar column on wide
  viewports; the 2026-07-17 follow-up removed it — see the log.)
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
- Chrome visual check at 1280px and 500px, both themes: tags-above-list at both
  widths, tag + search filtering, pressed state, and the `:focus-visible` ring on
  the search field and tag toggles. (Post-follow-up: the description column holds
  a readable measure at wide widths instead of a right-hand sidebar crushing it —
  measured 576px at 1600/1200px and 478px at 1100px, guarded by an e2e lower
  bound.)

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `blog-list-page`.
- 2026-07-17 — Implemented on `blog/blog-search-and-filter`. Search-param state,
  search bar, tag sidebar, pure filter, responsive layout, no-match state; full
  unit + e2e + Chrome verification green. Merged as PR #46.
- 2026-07-17 — **Follow-up fix (post-merge):** removed the wide-viewport
  right-hand tag column. On wide screens the `max-content` sidebar starved the
  three-column list row, collapsing the description into a per-word (even
  per-character) wrapping sliver — the layout bug the initial Chrome check missed
  by only sampling 1280px and 500px, not the mid/wide band where the
  three-column row is active. The tags now stack above the list at **every**
  width (the narrow layout, generalized), so the list keeps the page's full
  measure and the description holds its ~60ch column. Verified in Chrome at wide
  (1280px) and narrow, both themes, and locked in with an e2e lower-bound
  assertion on the description width at 1600/1200/1100px. Own branch + PR off
  `main`.
- 2026-07-17 — **Follow-up refactor (post-merge):** made search truly reactive
  and consolidated the controls onto Base UI. Root cause of the reported "search
  isn't reactive / loses focus" bug: the list filtered off the URL, so it only
  updated after a debounced navigation, and that navigation tripped the
  route-change focus handoff (which compared full `href`, so a search-param
  update looked like a page change) and yanked focus to the `<h1>`. Fixes:
  (a) `router.tsx` now keys the handoff on `pathname` (`isPageNavigation`), so
  in-page filter updates keep focus — this also fixed focus jumping on tag
  toggles; (b) search text now lives in local state that filters instantly, with
  the URL a debounced mirror (`use-blog-filters.ts`); (c) the search field is now
  the shared, Base-UI `SearchInput` (`-shared/components/search-input`) styled to
  the lit-tracker mockup (rounded pill + magnifier icon), replacing the
  hand-rolled `SearchBar`; (d) the tag toggles moved from native
  `<button aria-pressed>` to Base UI `Toggle`. Verified in Chrome (both themes,
  narrow→wide): live filtering mid-keystroke, focus retained in the search box
  and on tag toggles, pressed styling, no overflow. Locked in with e2e
  focus-retention guards for search and tags, plus a unit test for instant
  filtering. Research updated: Base UI extension policy + shared-primitive note
  (`design-system.md`), reactive continuously-edited-state pattern
  (`state-management-conventions.md`), pathname-scoped focus handoff
  (`keyboard-and-focus-management.md`), and a `search-input.md` component spec.
  Own branch + PR off `main`. Merged as PR #49.
- 2026-08-01 — **Follow-up fix (post-merge):** a tag toggle kept its focus ring
  after a pointer/touch tap. Because focus now stays on the toggle after
  activation (the PR #49 handoff fix), on mobile the browser paints a
  `:focus-visible` ring for that retained focus — and the ring is the accent
  color, identical to a selected tag, so on a *deselected* tag it read as "still
  selected." Fix: `tag-filter.tsx` drops focus after a pointer/touch activation
  (`event.detail > 0`) but keeps it for keyboard (`detail === 0`), so keyboard
  users still get focus + ring while a tap leaves no lingering ring at all
  (removing focus removes any ring, independent of the browser's focus-visible
  heuristic). Verified in Chrome (select→deselect leaves focus on neither the
  tag nor the heading; deselected tag returns to the muted baseline). Locked in
  with unit tests (pointer drops focus, keyboard keeps it) and e2e guards for
  both modalities. Own branch + PR off `main`. Merged as PR #50.
- 2026-08-01 — **Follow-up fix (post-merge):** a deselected tag still showed the
  accent color on mobile (the selected color, only missing the bold). Cause was
  **sticky `:hover`**, not focus: a touch device latches `:hover` onto the last
  element tapped and never releases it, and `.tag:hover` used the same accent as
  the selected state. (The earlier pass mistook this for a desktop-only hover
  artifact — it reproduces on touch.) Fixed by gating hover-only affordances
  behind `@media (hover: hover)`, applied to all four ungated `:hover` rules in
  the codebase (tag filter, theme toggle, site header links, post titles), since
  every one had the same latent defect. Reproduced and verified in WebKit iPhone
  emulation — before: deselected tag `rgb(11,87,208)`; after: `rgb(89,89,89)`
  muted baseline, with the selected state still accent + bold — and confirmed all
  four still hover normally on a real pointer. Locked in with an e2e guard in a
  touch-emulated context, checked to fail when the gate is removed. Convention
  recorded in `research/coding-conventions/styling-conventions.md`. Own branch +
  PR off `main`.
