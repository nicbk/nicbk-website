# Research Traceability: Collection View

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*` artifact. The narrow,
feature-local choices — scope calls the research leaves open, and facts
re-verified at spec time — are recorded in "Notes" below rather than left
implicit, per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).

## High-level design

- [../../high-level-guidance/design/lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)
  — "User can set read status for an article (e.g. `pending`, `reading`,
  `read`)" as a top-level feature of the tracker, and the site-wide native
  reactivity rule ("live updated across all live clients") applied to every
  surface that shows shared persisted data. This feature is where the first of
  those becomes reachable and where the second is first driven by a *user's*
  write rather than a job handler's.
- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — native reactivity as a site-wide constraint, and shared infrastructure: no
  new service is introduced here.
- [../../research/ui-ux/sample-mockups/literature-tracker-sample.png](../../research/ui-ux/sample-mockups/literature-tracker-sample.png)
  — the rough look this feature finally realizes: rounded cards in a grid, the
  rail's tag buttons above the account avatar, and the search bar opening the
  main panel. Rough guidance, not literal spec, per
  [../../research/ui-ux/pages/index.md](../../research/ui-ux/pages/index.md).

## Pages and components

- [../../research/ui-ux/pages/lit-tracker/pages/collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  — the whole feature, essentially: card content (title, authors with the "3 or
  more → et al." rule, year, tags; no date-added), the three-dot menu, the
  responsive grid with **container queries on the card itself**, the unified
  tag/reading-status filter model, live search over the synced cache, infinite
  scroll, the "+" button beside the search bar, and the plain-inline-text empty
  state — plus its **2026-08-08 revision** (no visible page title; toolbar and
  cards in one content column) written while building #7's task 3.
- [../../research/ui-ux/pages/lit-tracker/components/article-edit.md](../../research/ui-ux/pages/lit-tracker/components/article-edit.md)
  — the interface the card's three-dot menu is specified to open. It is #11; see
  the Notes for how this feature's tag and status controls relate to it.
- [../../research/ui-ux/pages/site-wide/pages/blog-list.md](../../research/ui-ux/pages/site-wide/pages/blog-list.md)
  — the tag-sidebar and search-bar precedent `collection-view.md` explicitly
  cites, already implemented in `src/routes/(personal-site)/blog/-list-page/`.
  The style, the toggle interaction, and the URL-backed filter state are reused
  from there rather than re-invented.
- [../../research/ui-ux/pages/lit-tracker/components/header.md](../../research/ui-ux/pages/lit-tracker/components/header.md)
  — the fixed app-shell layout with independently scrolling bounded panels this
  page sits inside; the rail this feature fills is one of those panels.
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules from global tokens, Base UI primitives, Lucide icons, light/dark
  theming; **container queries for reusable components, naming the article card
  as the example**; media-query breakpoints for page-level shifts, **naming the
  lit-tracker sidebar filters moving below the main content on mobile**; the
  empty-collection and cold-load feedback defaults; the **editing vs
  non-editing** rule for UI bound to reactive data; and the dismissible toast for
  errors outside a form context.

## Data model

- [../../research/data-modeling/tags-and-reading-status.md](../../research/data-modeling/tags-and-reading-status.md)
  — `tags` and `article_tags` column by column, per-user scoping, and the
  decision that **reading status is a plain `articles.status` column, not tag
  rows** — with the rejected alternative (seeded rows, a denormalized `kind`, a
  partial unique index, a protect-the-built-ins trigger) and why. It also states
  the cost this feature pays for that: the three built-ins are synthesized in the
  UI to render identically to real tags.
- [../../research/data-modeling/article-core-schema.md](../../research/data-modeling/article-core-schema.md)
  — the `status` column this feature writes, and the standing caveat that
  `authors_search` and its `pg_trgm` index are **not** what reactive search uses.
- [../../research/data-modeling/zero-schema-conventions.md](../../research/data-modeling/zero-schema-conventions.md)
  — client-generated UUIDv7 primary keys (which matters here: these are the first
  rows a *client* creates), `timestamptz`, hard deletes, `ON DELETE CASCADE` on
  ownership FKs, and the Drizzle-declared schema with `zero/schema.gen.ts`
  generated from it.
- [../../research/technologies/orm.md](../../research/technologies/orm.md),
  [../../research/devops-deployment/database-migrations.md](../../research/devops-deployment/database-migrations.md)
  — Drizzle owns DDL; migrations complete before the app starts; expand/contract
  discipline.

## Sync, writes, and authorization

- [../../research/technologies/sync-engine.md](../../research/technologies/sync-engine.md)
  — Zero, chosen for read *and write* sync with optimistic mutations. This
  feature is the first to use the write half.
- [../../research/system-architecture/reactivity-propagation.md](../../research/system-architecture/reactivity-propagation.md)
  — the propagation path and `useQuery` re-rendering; authorization at
  subscription time.
- [../../research/system-architecture/data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md)
  — per-user scoping **enforced in the app server's `/query` and `/mutate`
  handlers**, because Zero has no RLS-style layer. The single most load-bearing
  citation here, exactly as it was for #7's task 1 — this feature is the other
  half of that boundary.

## Conventions

- [../../research/coding-conventions/state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  — filter state in the URL as the shareable source of truth, with local state
  only where instant feedback demands it.
- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md),
  [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md),
  [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md),
  [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md),
  [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md),
  [../../research/coding-conventions/hook-extraction-conventions.md](../../research/coding-conventions/hook-extraction-conventions.md),
  [../../research/coding-conventions/import-conventions.md](../../research/coding-conventions/import-conventions.md),
  [../../research/coding-conventions/code-comments.md](../../research/coding-conventions/code-comments.md)
  — 1:1 component-to-`.module.css`, kebab-case files, named exports,
  function-declaration components, `strict` TS, the separated type-import style,
  and reason-giving comments.

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md),
  [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md),
  [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md),
  [../../research/accessibility/motion-and-reduced-motion.md](../../research/accessibility/motion-and-reduced-motion.md)
  — contrast and focus visibility in both themes, menu focus trap/restore and
  keyboard dismissal, accessible names on icon-only controls, state conveyed by
  more than color, and reduced-motion respect for anything that animates.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md),
  [../../research/testing-qa/integration-testing-strategy.md](../../research/testing-qa/integration-testing-strategy.md),
  [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md),
  [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md),
  [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md)
  — the tiers, Testcontainers Postgres with real migrations, ratchet coverage,
  Playwright asserting on DOM state, and inline axe.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md),
  [../../research/project-management-conventions/issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md),
  [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — the folder structure and per-task PR gating; GitHub Issues with native
  sub-issues and a parent closed **by hand**; Conventional Commits on PR titles.

## What #7 left for this feature to consume

Not research, but the concrete inheritance — recorded here so no task
rediscovers it:

- `CollectionToolbar` **reserves the search slot** rather than collapsing it, so
  the "+" and status controls already sit where the search bar's trailing edge
  will be.
- `LitTrackerSidebar` renders an **empty `filters` div** above the account
  avatar, sized to its contents, so it widens on its own when this feature fills
  it. It is deliberately not a `<nav>` yet — naming an empty landmark would
  announce a navigation region with nothing in it.
- `ArticleCollection` owns the **syncing / ready / error** split and the
  empty-state wording, and `formatAuthors` already implements the et-al rule.
  The list markup is what this feature replaces; those are not.
- `mutators.ts` is `defineMutators({})` and `mutate-endpoint.ts` already carries
  the exact line its first consumer replaces:
  `mustGetMutator(mutators, name).fn({args, tx, ctx})` with `ctx` from
  `zeroContextFrom(session)`.
- The Zero provider is loaded **client-only** (`React.lazy` inside
  `ClientOnly`), so nothing under it exists until hydration — which is why
  "still syncing" and "genuinely empty" must stay distinguishable.

## Notes / narrower research (feature-local, not global)

- **Verified current at spec time (2026-08-09)**, per research-over-recall,
  against the installed packages rather than from memory:
  - **Zero 1.8.0's mutator API** is `defineMutator(validator, ({args, ctx, tx})
    => …)` composed into a registry by `defineMutators({…})`, dispatched
    server-side by `mustGetMutator(registry, name).fn({args, tx, ctx})`. The
    validator is any Standard-Schema validator, so the Zod already in the project
    fits — the same arrangement `queries.ts` uses for query arguments. This is
    exactly the shape `mutate-endpoint.ts`'s placeholder comment anticipated, so
    no rework of #7's endpoint is expected.
  - **Base UI 1.6 ships `menu`, `toggle-group`, `combobox`, and `toast`** —
    the primitives this feature needs for the card menu, the mutually-exclusive
    status group, tag entry with create-if-missing, and the mutation-failure
    toast. Nothing has to be hand-rolled, consistent with the decided
    "build on the component library, not beside it" rule. `toggle` is already in
    use by the blog's tag filter.
- **Tag assignment lives in #8 (scope call, agreed with the user).**
  `collection-view.md` routes all tag editing through the card's three-dot menu
  into `article-edit`, which is #11 and is not scheduled before this feature — so
  read literally, this feature would ship a tag filter over a tag set the user
  cannot populate. The resolution: **#8 owns applying tags and setting reading
  status; #11 owns metadata, references, and delete**, and #11 adds its items to
  the menu #8 builds rather than replacing it. Reading status in particular is a
  collection-view concept in the decided model — it renders *as a tag*, in the
  same filter list — and the tracker's design brief lists setting it as a
  top-level feature.
- **Venue is added to the card's field list (scope call, agreed with the user).**
  `collection-view.md` specifies title, authors, year, and tags. #7's enrichment
  recovers venue reliably (it was populated on every enriched article in the
  browser verification), and no surface on the site displays it. Shown only when
  present; a preprint simply has none.
- **Cards do not navigate in this feature (scope call).** Their decided click
  target is the article detail page, which is #9. Rather than invent a
  placeholder route — the throwaway-consumer mistake #6 and #7 both avoided —
  the card ships without a link and #9 adds one. Same reasoning that left the
  projects page's tracker entry unlinked until the route existed.
- **A rejected mutation needs somewhere to go (open item for task 2).** This is
  the first feature whose client writes can fail server-side, and
  `design-system.md`'s decided pattern for an error outside a form context is a
  dismissible toast — of which the site has none, a gap `ArticleCollection`'s
  own comment already notes. The proposal is that **task 2 builds a shared toast**
  on Base UI's `Toast` under `src/routes/-shared/components/`, and the
  collection's inline error notice may then move onto it. Flagged rather than
  assumed, because it makes a site-wide component out of a lit-tracker need; the
  alternative — an inline message beside the card — is cheaper and would be a
  documented deviation.
- **Search stays client-side, and that is a decision, not an omission.**
  `article-core-schema.md` created `authors_search` and its trigram index for a
  *future server-side* search and states plainly that reactive search does not
  read them. Zero syncs the whole collection to the client, so filtering is a
  predicate over rows already in memory — the same shape as the blog's
  `filterPosts`. If a collection ever grows past what is sensible to sync, that
  is a query-shape change, not a search-implementation change.
- **Infinite scroll here is rendering, not fetching.** The blog's
  `useIncrementalReveal` reveals more of an already-loaded list as a sentinel
  scrolls into view; the collection's rows are likewise already on the client.
  Reusing that hook keeps one mechanism on the site instead of two that drift.
- **Filtering is done in JavaScript over synced rows, not in ZQL.**
  `tags-and-reading-status.md` confirms ZQL can combine a column filter and a
  relationship filter in one reactive query, so a ZQL-side implementation is
  possible. It is not used, because search must filter as the user types over
  data already in memory, and splitting "filter by tag" into ZQL while "filter by
  text" stays local would mean two filtering mechanisms whose composition is the
  feature's whole point. One predicate, one place.
- **`e2e/` and `e2e-auth/` are outside `tsconfig.json`'s `include`** — carried
  over from #7, where a missing import in a Playwright spec surfaced only at
  runtime. Not this feature's cause, but this feature adds specs to both, so
  whichever task touches them first should close it.
