# Research Traceability: Article Detail and Reader

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*` artifact. The narrow,
feature-local choices — scope calls the research leaves open, and facts
re-verified at spec time — are recorded in "Notes" below rather than left
implicit, per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).

## High-level design

- [../../high-level-guidance/design/lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)
  — "The user can view the article through a built-in reader interface which
  allows the user to also markup the document with annotations (these
  annotations get persisted)". That single line is this feature, and it is the
  last of the tracker's stated features to have no implementation at all. The
  site-wide native-reactivity rule applies to the annotations it persists.
- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — native reactivity and shared infrastructure. No new service is introduced;
  the PDFs are already in Garage and the annotations go in the Postgres that is
  already there.

## Pages and components

- [../../research/ui-ux/pages/lit-tracker/pages/article-detail.md](../../research/ui-ux/pages/lit-tracker/pages/article-detail.md)
  — the page, essentially: the metadata summary and its three-dot menu, the
  reader as main content, the four-tab left sidebar (Tags, Notes, Citations,
  Annotations), which tab swaps the main area and which does not, and the
  responsive rule that the sidebar becomes a drawer — open by default wide,
  collapsed narrow. Also the Semantic Scholar attribution requirement, which
  travels to #10 with the data that triggers it.
- [../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  — the reader and its toolbar: persistent rather than floating, the 12 exposed
  annotation types, tool-select-then-apply with the tool staying active, live
  reactive persistence through `AnnotationScope` fed by `onAnnotationEvent`, and
  the Annotations tab's list-only behavior with jump-to-page.
- [../../research/ui-ux/pages/lit-tracker/components/header.md](../../research/ui-ux/pages/lit-tracker/components/header.md)
  — the fixed app-shell layout of bounded, independently scrolling panels this
  page sits inside. The reader is one of those panels, which is why the document
  scrolls itself and the page never does.
- [../../research/ui-ux/pages/lit-tracker/pages/collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  — the card whose decided click target is this page, and the tag model this
  page's Tags tab presents a second view of.
- [../../research/ui-ux/pages/lit-tracker/components/article-edit.md](../../research/ui-ux/pages/lit-tracker/components/article-edit.md)
  — what the detail page's three-dot menu is specified to open. It is #11; this
  feature reuses #8's menu and #11 extends it.
- [../../research/ui-ux/pages/lit-tracker/components/citation-graph.md](../../research/ui-ux/pages/lit-tracker/components/citation-graph.md)
  — the view the Citations tab activates. Cited here to record what this feature
  is deliberately not building.
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules from global tokens, Base UI primitives, Lucide icons, light/dark
  theming, container queries for reusable components and media queries for
  page-level shifts, the **editing vs non-editing rule** for UI bound to
  reactive data (load-bearing for the Notes field), and the dismissible toast
  for errors outside a form context.

## Data model

- [../../research/data-modeling/annotations-schema.md](../../research/data-modeling/annotations-schema.md)
  — the `annotations` table column by column; the reasoning for `payload jsonb`
  over 13 normalized tables; why `page_index` and `contents` are promoted to
  columns while everything type-specific is not; why neither `author` nor
  EmbedPDF's own timestamps are persisted; both FKs `ON DELETE CASCADE`; and the
  exclusion of stamp annotations.
- [../../research/data-modeling/article-core-schema.md](../../research/data-modeling/article-core-schema.md)
  — `articles.notes`, the column this feature's Notes tab finally writes, and
  `pdf_object_key`, which task 2 resolves to a Garage object.
- [../../research/data-modeling/zero-schema-conventions.md](../../research/data-modeling/zero-schema-conventions.md)
  — client-generated UUIDv7 primary keys, `timestamptz`, hard deletes,
  `ON DELETE CASCADE` on ownership FKs, and the Drizzle-declared schema with
  `zero/schema.gen.ts` generated from it.
- [../../research/technologies/orm.md](../../research/technologies/orm.md),
  [../../research/devops-deployment/database-migrations.md](../../research/devops-deployment/database-migrations.md)
  — Drizzle owns DDL; migrations complete before the app starts.

## Technology

- [../../research/technologies/pdf-reader-annotations.md](../../research/technologies/pdf-reader-annotations.md)
  — **EmbedPDF**, chosen over the react-pdf-highlighter family after hands-on
  testing, specifically for its headless architecture and PDFium engine; and the
  2026-07-04 resolution that its annotation objects are portable and syncable
  independently of the PDF binary. See the Notes below for what has changed in
  the library since that was written.
- [../../research/technologies/sync-engine.md](../../research/technologies/sync-engine.md)
  — Zero, for read and write sync with optimistic mutations. Annotations are the
  second client-written table.
- [../../research/technologies/blob-storage.md](../../research/technologies/blob-storage.md)
  — Garage as the blob store, where #7 put every PDF and where task 2 reads them
  back from.

## Security and authorization

- [../../research/security-privacy/pdf-and-annotation-data-protection.md](../../research/security-privacy/pdf-and-annotation-data-protection.md)
  — **the single most load-bearing citation for task 2**: all PDF reads and
  writes proxy through the app server, and **no presigned Garage URL is ever
  issued**, because one grants access to whoever holds it independent of this
  server's checks. It also states that annotations need no new mechanism —
  they inherit the `user_id` scoping the `/query` and `/mutate` handlers already
  enforce.
- [../../research/system-architecture/data-sharing-boundaries.md](../../research/system-architecture/data-sharing-boundaries.md)
  — per-user scoping enforced in the app server's handlers, because Zero has no
  RLS-style layer behind them.
- [../../research/system-architecture/reactivity-propagation.md](../../research/system-architecture/reactivity-propagation.md)
  — the propagation path and authorization at subscription time.
- [../../research/security-privacy/app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  — the header posture the PDF response continues to sit under.

## Conventions

- [../../research/coding-conventions/state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  — URL as the shareable source of truth, local state only where instant
  feedback demands it. Relevant to which sidebar tab is active.
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
  — contrast and focus visibility in both themes, the tab interface's keyboard
  model, accessible names on icon-only controls, state conveyed by more than
  color, and reduced-motion respect for the drawer transition.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md),
  [../../research/testing-qa/integration-testing-strategy.md](../../research/testing-qa/integration-testing-strategy.md),
  [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md),
  [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md),
  [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md)
  — the tiers, Testcontainers Postgres with real migrations, ratchet coverage,
  and inline axe. Note the **2026-08-09 addenda**: both Playwright tiers are
  suspended, and with them every axe scan.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md),
  [../../research/project-management-conventions/issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md),
  [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — the folder structure and per-task PR gating; GitHub Issues with native
  sub-issues and a parent closed **by hand**; Conventional Commits on PR titles.

## What #7 and #8 left for this feature to consume

Not research, but the concrete inheritance — recorded here so no task
rediscovers it:

- **`getArticlePdf` already exists** in `src/storage/pdf-storage.ts`, alongside
  `isOwnedBy` in `src/storage/object-key.ts`. The module's own header states the
  proxy rule and says no presigned URL is ever issued. Task 2 is the caller
  these were written for, and has never had one.
- **`articles.notes` exists and nothing writes it.** The column has been there
  since #7's migration.
- **`citation_edges` exists and is already synced** — #7 populates it from
  Semantic Scholar. #10 draws it; this feature does not.
- **The card menu, the tag toggles, the tag mutators, and the filters drawer**
  are all #8's, and all reusable here. The Tags tab is a second presentation of
  a model that already works, not a second model.
- **The Zero provider is loaded client-only** (`React.lazy` inside
  `ClientOnly`), which is the pattern the reader's own client-only mount should
  follow rather than invent.
- **The app shell is `100dvh` with panels that scroll themselves**, and
  `overscroll-behavior` is declared per-container on the axis each one scrolls —
  a rule the reader's scroll region inherits and must not re-break.

## Notes / narrower research (feature-local, not global)

- **Verified current at spec time (2026-08-09)**, per research-over-recall,
  against the published packages rather than from the 2026-07-02 decision:
  - **EmbedPDF is at 2.15.0**, published 2026-08-08, with `3.0.0-next.1` on the
    `next` dist-tag. **Build on 2.15.x stable**; a prerelease is not a foundation
    to put a feature on.
  - **The annotation API has moved since the technology decision was written.**
    It is now document-scoped: `useAnnotation(documentId)`, with
    `updateAnnotation(pageIndex, id, {...})` and `deleteAnnotation(pageIndex,
    id)` taking the page index. The plugin has peer dependencies the original
    research did not mention — `@embedpdf/plugin-interaction-manager` and
    `@embedpdf/plugin-selection` are required, `@embedpdf/plugin-history` is
    optional (undo/redo, out of scope here). Loading moved into
    `@embedpdf/plugin-document-manager`, which takes
    `initialDocuments: [{ url }]`.
  - **What has *not* changed is everything the decision rests on**: annotations
    are plain objects independent of the PDF binary, `createAnnotation` /
    `updateAnnotation` / `deleteAnnotation` / `onAnnotationEvent` /
    `importAnnotations` / `exportAnnotations` all still exist with those names,
    and the object shape still maps onto the decided schema. So
    [annotations-schema.md](../../research/data-modeling/annotations-schema.md)
    stands unrevised, and this is a change of import paths and call signatures
    rather than of design.
  - **The API surface is re-verified again inside task 4**, against the version
    actually installed at that point. A month-old check on a package that
    shipped a release yesterday is a starting point, not a substitute.
- **`onAnnotationEvent` carries a `committed` flag, and the sync design depends
  on it (spec-level finding, not an implementation detail).** The event
  distinguishes a finished change from an in-progress one. Persisting every
  event would write a row per animation frame while an ink stroke is dragged —
  through an optimistic client, a websocket, and Postgres. Only committed
  changes are persisted. This was not in the original research and is recorded
  here rather than left to be discovered by whoever notices the write volume.
- **The reader must be client-only, and that is a framework constraint, not a
  preference.** PDFium is WebAssembly; the rest of this site server-renders.
  EmbedPDF's documentation says nothing about SSR either way, so **task 3
  verifies the mounting approach against the running app before building on
  it**, and the fallback is the `ClientOnly` + `React.lazy` pattern the Zero
  provider already uses. Naming this as the task's first unknown is deliberate:
  it is the one thing in this feature that could invalidate an approach after
  the fact.
- **Citations is deferred to #10 (scope call, agreed with the user).**
  `article-detail.md` specifies a four-tab sidebar whose Citations tab swaps the
  main content for the citation graph — but the graph is #10, which depends on
  #9. The alternative considered was shipping Citations here as a plain
  bibliography list and upgrading it in #10; rejected because the list would be
  largely rebuilt, and building a throwaway consumer is the mistake #6, #7, and
  #8 each avoided. #9 builds three tabs; #10 adds the fourth and the view it
  opens. The **Semantic Scholar attribution** the page owes goes with it, since
  the requirement is triggered by S2-derived data being shown.
- **Five tasks rather than three or four (scope call, agreed with the user).**
  The reader splits into "serve the bytes" and "draw them" so the ownership
  check is reviewed on its own, away from WebAssembly mounting; and the
  annotations list splits from annotation persistence so a new synced table is
  not reviewed alongside its list UI. Smallest reviewable diffs, at the cost of
  two extra PRs.
- **Undo/redo is out of scope (raised with the user at spec time).** EmbedPDF
  offers it as an optional plugin and no decided document asks for it.
  Annotations sync live and are individually deletable, so an undo stack would
  be a second route to one outcome — the "prefer removing to adding" rule.
  Recorded because the plugin's availability makes its absence look like an
  oversight otherwise.
- **The detail page reuses #8's card menu rather than defining its own.**
  `article-detail.md` says the page's three-dot menu opens `article-edit` (#11);
  #8 already built a three-dot menu carrying tags and reading status. Two menus
  on two surfaces, differently populated, is the drift the duplication rule
  exists to prevent — so this page mounts #8's, and #11 adds its items to the
  one menu.
- **The PDF route's not-found behavior is a security property, not an error
  path.** Returning 403 for "not yours" and 404 for "not there" would make
  another user's article ids enumerable. Both return the same thing. Stated here
  because it is the kind of requirement that reads as a nicety and is not one.
- **Playwright stays suspended for this feature unless restored.** Both e2e jobs
  carry `if: false` at the user's direction until the tracker is built out, and
  every axe scan lives inside those suites. This feature therefore leans harder
  on the unit and integration tiers and on the browser pass, and
  [testing.md](./testing.md) states what that costs and what the suites will owe
  when they come back.
