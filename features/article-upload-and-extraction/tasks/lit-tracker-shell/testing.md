# Testing: Lit Tracker Shell

What this task's tests must cover. Tiers and tooling are the feature's
([../../testing.md](../../testing.md)).

This is the task that brings **e2e and accessibility coverage back**, and the
first that can prove live sync end to end rather than by inference.

## Unit (Vitest + `@testing-library/react`, jsdom)

- **Lit-tracker header** renders the app name as a link to the tracker root,
  the root breadcrumb segment, and an avatar with a discernible accessible
  name; activating the avatar opens the settings modal.
- **Collection surface** renders the plain inline empty-state text when the
  query returns no rows, and a list of titles and authors when it returns some
  — with the query result injected, so this stays a component test rather than
  a Zero test.
- Any pure helper the header or surface needs (breadcrumb segment construction,
  author display) is tested directly.

## Integration (Vitest + Testcontainers Postgres)

Nothing new. Task 1 proved `/query`'s scoping; this task adds no server
surface. If wiring the Zero client requires a server-side token or session
shape not already covered, that specific piece gets a case — otherwise this
tier is unchanged.

## End-to-end (Playwright)

- **Route guard, first live coverage:** a signed-out visit to `/lit-tracker`
  lands on `/sign-in` with the requested URL carried in the search params, and
  no interstitial page appears in between. With an injected session
  (`storageState`), the same URL renders the tracker.
- **Live sync, the point of the task:** with the page open, a row inserted for
  that user **appears without any navigation or reload**, asserted with a
  retrying matcher. Written as a DOM assertion, never a wire-level or
  fixed-sleep wait, per
  [e2e-testing.md](../../../../research/testing-qa/e2e-testing.md).
- **Settings modal, first live trigger:** the header avatar opens the modal and
  it shows the signed-in account email.
- **App-shell layout:** the header stays fixed while the content panel scrolls
  — asserted by scrolling the panel and confirming the header does not move,
  which is the actual behavioral difference from the site header.
- **Theming and widths:** correct in both themes with no flash of the wrong
  theme, at narrow, mid, and wide viewports.

## Accessibility

- `@axe-core/playwright` runs inline on `/lit-tracker` in **both themes**,
  blocking on critical/serious findings, and on the open settings modal reached
  from this header.
- The avatar and app-name link have discernible accessible names; focus is
  visible on both; the heading structure is valid; the modal traps and restores
  focus.

## Framework caveats to carry

- Use the `e2e/fixtures.ts` retry helpers rather than bare `click()` — the
  measured hydration race applies to every new control here.
- Wait for transitions to settle before any axe scan or one-shot read; a scan
  taken mid-transition measures a blend that is never a resting state.
- Judge the suite with `npm run test:e2e:prod`, not `npm run test:e2e`.
- **New with this task:** an assertion may now run before a synced diff has
  arrived. Retrying matchers handle it; a fixed sleep does not and must not be
  used.

## Browser verification (manual, recorded in status.md)

Required before the PR, per
[AGENTS.md](../../../../AGENTS.md)'s verify-in-the-browser rule — and this task
is exactly the case that rule exists for, since a fixed app shell with
independently scrolling panels is where layout and overflow bugs hide:

- Both themes, at narrow, mid, and wide widths, scrolling the content panel
  fully.
- The avatar → settings modal round-trip, driven by keyboard as well as
  pointer.
- Live sync watched directly: insert a row in Postgres with the page open and
  confirm it appears without touching the browser.
