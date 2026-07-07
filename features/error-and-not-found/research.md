# Research Traceability: Error and Not-Found Pages

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*.md` artifact. No
decision is improvised here (per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)).

## High-level design

- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — minimalist, monospace, plain-text personal-site style the two fallback
  pages follow.

## Page content

- [../../research/ui-ux/pages/site-wide/pages/not-found.md](../../research/ui-ux/pages/site-wide/pages/not-found.md)
  — the 404 page: plain-text "page not found" (no numeric code), a link home,
  uses the site header, same minimalist style as home/about.
- [../../research/ui-ux/pages/site-wide/pages/error-fallback.md](../../research/ui-ux/pages/site-wide/pages/error-fallback.md)
  — the generic error-fallback page: "something went wrong" + home link, the
  **optional technical-error-detail** capability, uses the site header;
  distinct from per-component reactive feedback states.
- [../../research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — the shared sticky header both pages render inside (factored into
  `SiteShell`, not rebuilt).
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — token-driven styling, light/dark theming, and the "Reactive UI feedback
  patterns" topic this feature is explicitly *not* (top-level page fallbacks
  vs. per-component states).

## Layout, conventions, and code style

- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md)
  — where a shared layout component (`SiteShell`) and the fallback page
  components live under `routes/`.
- [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md),
  [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md),
  [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md),
  [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md)
  — 1:1 component-to-`.module.css`, kebab-case files, named exports,
  function-declaration components, `strict` TS — matching the existing
  header/home-page precedent.

## System architecture

- [../../research/system-architecture/monorepo-structure.md](../../research/system-architecture/monorepo-structure.md)
  — single TanStack Start package; the fallbacks are wired at the root route's
  `notFoundComponent`/`errorComponent`, above the `(personal-site)` group.

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md)
  — the `<main id="main-content" tabIndex={-1}>` landmark (in `SiteShell`) as
  skip-link and focus-handoff target; each fallback page has a heading to
  receive focus.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md),
  [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md)
  — link/text contrast and visible focus in both themes; a semantic,
  accessibly-named disclosure control for the error-detail surface.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md)
  — Vitest + Testing Library for the shell and page components.
- [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md)
  — Playwright; assert on settled DOM/response state; the flagged
  Start+Playwright timing caveat.
- [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md)
  — ratchet coverage.
- [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md),
  [../../research/accessibility/testing-and-tooling.md](../../research/accessibility/testing-and-tooling.md)
  — `@axe-core/playwright` inline on both pages in both themes.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)
  — the feature/task folder structure and per-task PR gating.
- [../../research/project-management-conventions/issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  — parent issue + sub-issues; self-assign to claim; PR closing keywords.

## Notes / narrower research (feature-local, not global)

- **HTTP 404 status is a to-verify, not an assumption.** `not-found.md`
  specifies the page but not the response status; correct web behavior is a
  real 404, and TanStack Start may default a not-found render to HTTP 200.
  The `site-shell-and-not-found` task must verify and, if needed, set the
  status via the framework's supported mechanism. Narrow enough to record
  here rather than as a global decision; the e2e asserts the actual status.
- **Error-detail surfaced via a collapsed disclosure**, hidden by default,
  rather than a dev-only gate — `error-fallback.md` calls the detail
  "expected to be used rarely" but wants the capability to exist, which a
  visible-on-demand disclosure satisfies without exposing stacks to normal
  users. This is a presentation choice within the decided requirement, not a
  new decision.
