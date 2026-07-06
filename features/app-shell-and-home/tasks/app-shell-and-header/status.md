# Status: App Shell and Header

**State:** Implemented — PR open, awaiting CI + human review.

- Branch: `app-shell-and-home/app-shell-and-header`
- Sub-issue: [#4](https://github.com/nicbk/nicbk-website/issues/4), self-assigned
- PR: #9 (`Closes #4`)
- CI: temporary GitHub-hosted runners (see the scaffold task's status.md)
- Human review: pending

## Verification done locally (2026-07-05)

- 36/36 unit tests (header structure/links/no-auth/no-active-marker via the
  decided Link-mock pattern, plus all prior suites).
- 8/8 Playwright e2e, run twice to check for flakiness: skip link first
  focusable + moves focus to `<main>`; client-side nav focus handoff to the
  destination heading; sticky header + single row at 320px and 1280px;
  unknown route → HTTP 404 + minimal not-found; axe (WCAG 2.2 AA,
  critical/serious blocking) in both themes; keyboard nav with visible
  focus indicator. Includes the theme e2e deferred from
  design-system-foundation (no-flash first paint, persistence across
  reload).
- Biome and typecheck clean.

## Deviations / notes

- **Nav links are typed `<Link>`s backed by trivial stub routes**
  (`projects.tsx`/`blog.tsx`/`about.tsx`, one `<h1>` each). The task spec
  imagined links pointing at not-yet-built pages, but TanStack's typed
  router won't compile a `Link` to a nonexistent route, and the
  focus-handoff e2e needs real client-side navigation between two routes.
  The stubs are explicitly placeholders owned/replaced by the
  `projects-page`/`blog`/`about-page` features.
- **Theme toggle placed at the header row's far end** — the theming
  decision (research/ui-ux/design-system.md) puts the persistent toggle on
  "the site-wide header/user-settings surface"; the personal site has no
  user-settings surface, so the header is it. The header spec's structure
  list predates the toggle decision and doesn't mention it.
- **Hydration-timing e2e mitigation:** the two tests that click immediately
  after load hit the known TanStack Start + Playwright hydration gap
  flagged in research/testing-qa/e2e-testing.md (pre-hydration clicks are
  dropped / fall back to full page loads). Mitigated with
  `waitUntil: 'networkidle'` + Playwright's `toPass()` retry, commented in
  the specs.
- **Error-boundary coverage is unit-level** (rendering `RootErrorFallback`
  is trivial and it's exported for the purpose if needed) — no synthetic
  always-throwing route was added just for e2e; the not-found path is
  covered e2e. The full designed error/404 pages are the
  `error-and-not-found` feature.
- **e2e runs locally only for now** (`npm run test:e2e`); CI wiring is the
  `containerization-and-deployment` task per the feature plan.

## Log

- 2026-07-05 — Claimed (#4), implemented on branch: `(personal-site)`
  layout route (header + `<main id="main-content">`), sticky single-row
  SiteHeader (name → home, projects/blog/about, divider, clamp() type,
  theme toggle at far end), site-wide SkipLink (first focusable, visually
  hidden until focus), focus handoff on client navigation
  (`src/focus-handoff.ts` + router `onResolved` subscription), minimal
  root not-found/error boundaries, Playwright + @axe-core/playwright
  with the shared severity-filtered axe fixture. All local checks green.
