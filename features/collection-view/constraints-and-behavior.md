# Constraints and Behavior: Collection View

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## The article card

Per
[collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md):

- A card shows **title, authors, publication year, and tags** (the
  reading-status tag among them). **Venue** is shown as well when the article
  has one — added to the decided list with the user, since #7's enrichment
  recovers it reliably and nothing on the site displays it yet. Any field the
  article lacks is simply absent; no placeholder text, no empty label.
- **Authors**: fewer than three, show all; three or more, show the first author
  followed by "et al." This is `formatAuthors` from #7 — the rule is already
  implemented and tested, and is reused rather than re-derived.
- **No date-added field**, per the decided card content.
- **Layout is a grid that collapses to a single column** on narrow screens. The
  card itself adapts by **container query**, not by page width, so it is correct
  in the main grid and in any narrower container a later feature places it in
  ([design-system.md](../../research/ui-ux/design-system.md)).
- The card carries a **three-dot menu in its top-right corner**. In this feature
  it holds tag and reading-status controls; #11 adds "edit…" and "delete…" to
  the same menu.
- **The card does not navigate.** Its decided click target is the article detail
  page (#9), which does not exist; until it does the card is not a link and
  offers no pointer affordance suggesting it is.
- The **empty collection** still renders as plain inline text, and the
  syncing/ready/error distinction #7 established is preserved — an unsynced
  collection must never be drawn as an empty one.

## Schema

- `tags` and `article_tags` are declared in Drizzle and migrated through the
  existing pipeline, exactly as specified in
  [tags-and-reading-status.md](../../research/data-modeling/tags-and-reading-status.md):
  `tags(id, user_id, name, created_at)` and
  `article_tags(id, article_id, tag_id, created_at)` with
  `unique (article_id, tag_id)`.
- **UUIDv7 primary keys generated on the client**, `timestamptz` timestamps,
  hard deletes, and `ON DELETE CASCADE` on all three foreign keys — every one is
  an ownership relationship, per
  [zero-schema-conventions.md](../../research/data-modeling/zero-schema-conventions.md).
- **Reading status stays `articles.status`**, a plain column. It is not a tag
  row, and no table is added for it; the three built-ins are synthesized in the
  UI. This is the decided model and the reason `tags` carries no `kind` column.
- Both tables are added to the **`zero_data` publication** and to
  `drizzle-zero.config.ts` **in the migration that creates them**, and
  `src/zero/schema.gen.ts` is regenerated — the standing rule every feature that
  adds a synced table inherits from #7, enforced by the CI drift check.
- Tags are **per-user**. There is no shared or cross-user tag, consistent with
  [data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md).

## Writes and authorization

- The client writes through **Zero custom mutators** registered in
  `src/zero/mutators.ts` and executed server-side by the existing `/mutate`
  endpoint. No new REST endpoint is added for any of this.
- Every mutator derives its owner from the **server-derived context**
  (`zeroContextFrom(session)`), never from arguments — the same rule `/query`
  follows, for the same reason: Zero has no permissions layer behind these
  handlers.
- A mutation naming another user's article or tag **must fail server-side** and
  leave no row behind, even though the client's optimistic copy allowed it. This
  is verified non-vacuously — with the other user's rows genuinely present.
- The mutators are: **create tag**, **delete tag**, **attach tag to article**,
  **detach tag from article**, and **set reading status**. Deleting a tag
  removes its `article_tags` rows by cascade rather than by a second write.
- The new tables are **read by sync, not by fetch**: they get their own
  `defineQuery` entries in `src/zero/queries.ts`, scoped by `ctx.id` and
  returning `.limit(0)` with no session, exactly like the queries already there.
  A card's tags come from synced rows, so a tag applied anywhere reaches every
  client through the same path everything else does.
- **Optimistic and live**: a change applies locally at once and reaches every
  other open client by sync. Observing that by hand needs a second **window**,
  not a second tab — Zero drops sync for a hidden document, a finding recorded
  in
  [#7's task 3](../article-upload-and-extraction/tasks/pdf-upload-and-storage/status.md).
- A mutation the server rejects surfaces to the user rather than vanishing
  silently; the decided pattern for an error outside a form context is a
  dismissible toast
  ([design-system.md](../../research/ui-ux/design-system.md)).

## Tag and reading-status interaction

- Tags are **user-defined**, freely created and deleted, and applied to any
  number of articles.
- The **three reading statuses render as tags** in the same list and the same
  visual treatment, but (a) cannot be renamed or deleted and (b) are **mutually
  exclusive** — choosing one clears the previous. Mutual exclusivity is a free
  property of the single-valued column, not a constraint to enforce.
- Applying a tag from the card menu **creates it if it does not exist**, so
  there is no separate "manage tags" surface to visit first.
- The card menu is a real menu: keyboard-operable, focus-trapped while open,
  dismissible with Escape, and restoring focus to its trigger on close.

## Filtering and search

- The left rail lists **every tag the user has** plus the three statuses, each a
  toggle. Tags are **multi-select and AND-composed** (an article must carry all
  selected tags), matching the blog's tag sidebar, which this reuses the style
  of.
- The statuses behave as a **single-select group** within that list.
- The **search bar matches title, authors, tags, and reading status**, filtering
  **live as the user types** against the already-synced Zero rows — never a
  submit or a server round-trip.
- Search and rail filters **compose**: the visible set is the intersection.
- **Filter state lives in the URL**, so a narrowed collection is shareable and
  survives refresh and back/forward — the pattern
  [state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  decided and the blog list already implements.
- When filters exclude everything, the page says so **distinctly from an empty
  collection**: "no articles match" and "no articles yet" are different facts.
- **Pagination is infinite scroll** — incremental reveal of rows already on the
  client, per
  [collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  and the blog list's precedent. No server paging, and no numbered pages.

## Toolbar layout

- The toolbar, and the card grid below it, share **one content column of the
  same width** — the arrangement settled in #7's 2026-08-08 revision.
- The **"+" button and the upload-status indicator sit immediately against the
  search input's trailing edge** at every width, moving with it rather than
  staying pinned to the far edge of the column. Neither control changes
  behavior; only their position is this feature's concern.
- The page still draws **no visible title**; the clipped `<h1>` remains as the
  landmark and focus-handoff target.

## Cross-cutting quality

- WCAG 2.2 AA throughout: 4.5:1 text / 3:1 non-text contrast in both themes;
  visible focus indicators on the card menu trigger, every menu item, every
  filter toggle, and the search input; a discernible accessible name on the
  icon-only menu trigger that identifies **which** article it belongs to; toggle
  state exposed as `aria-pressed` and conveyed by more than color alone; the
  filter list marked up as a navigation region only once it has contents; the
  card grid a real list to assistive technology; live filtering announced
  without flooding a screen reader on every keystroke.
- Correct in both light and dark themes, with no flash of the wrong theme, and
  at narrow, mid, and wide widths — the grid, the rail's narrow-screen
  relocation, and the toolbar row are all width-dependent.
- Runs identically via `npm run dev`, the production Nitro server, and
  `docker compose up`.
- CI (Biome, typecheck incl. CSS-Module codegen and the `zero/schema.gen.ts`
  drift check, unit + integration tests with ratchet coverage, Playwright e2e +
  axe, PR-title lint) passes.

## Explicitly out of scope

- **The article detail page and the PDF reader** (#9). Cards do not navigate.
- **Editing metadata or references, and deleting an article** (#11) — which is
  still why a failed upload's warning row cannot be cleared.
- **Citation-graph traversal UI** (#10).
- **Server-side search** against `authors_search` and its `pg_trgm` index. They
  stay unused, exactly as their own schema doc predicted.
- **Sort controls.** Order remains newest-first from #7's query.
- **Bulk operations** — multi-select of cards, tagging many at once. Nothing
  decided calls for them.
- **Tag renaming.** The decided model allows created and deleted; nothing
  specifies a rename affordance, and inventing one here would be a UI decision
  taken without a decision behind it.
