# Research Traceability: Projects Page

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*.md` artifact — per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).
The one gap the decided research does not cover (what the entry links to
before the Literature Tracker exists) is recorded at the bottom, with the
decision taken and the follow-up it is owed.

## High-level design

- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — the site has a simple projects page (line 40), and the Literature Tracker
  is reached through it (line 47).
- [../../high-level-guidance/design/lit-tracker/DESIGN.md](../../high-level-guidance/design/lit-tracker/DESIGN.md)
  — what the Literature Tracker is; the source of the entry's one-line
  description (upload, read/annotate, track reading progress).

## Page content

- [../../research/ui-ux/pages/site-wide/pages/projects.md](../../research/ui-ux/pages/site-wide/pages/projects.md)
  — the decided page: a simple list of sub-applications, each entry a name
  plus a one-line description in a dimmer color, no card/grid layout and no
  extra metadata; one entry at launch (the lit tracker); uses the site header.
- [../../research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — the shared sticky header this page renders inside (already built by
  `app-shell-and-home`; reused, not rebuilt) and the source of the `projects`
  nav link that currently resolves to a placeholder.
- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules from global tokens, JetBrains Mono, light/dark theming, and
  the simplicity philosophy the page's styling follows; also the rule that
  components extend Base UI primitives rather than hand-rolling equivalents
  beside them (this page renders only text and a list, so no primitive
  applies).

## Layout, conventions, and code style

- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md)
  — page code colocates with its route under a `-`-prefixed folder excluded
  from the route tree, matching `-about-page/` and `-list-page/`.
- [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — 1:1 component-to-`.module.css`, camelCase module class names,
  token-driven styling, global CSS reserved for tokens and cross-cutting
  primitives; hover-only affordances gated behind `@media (hover: hover)` (this
  page has none — the entry is deliberately non-interactive).
- [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md),
  [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md),
  [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md),
  [../../research/coding-conventions/import-conventions.md](../../research/coding-conventions/import-conventions.md)
  — kebab-case files, named exports, function-declaration components, `strict`
  TS, import grouping — matching the home/about/blog precedent.

## System architecture / hosting

- [../../research/system-architecture/monorepo-structure.md](../../research/system-architecture/monorepo-structure.md)
  — a single TanStack Start package; `/projects` is a route in the
  `(personal-site)` group, and the Literature Tracker will later be its own
  route subtree with its own header rather than a separate package.

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md),
  [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md),
  [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md)
  — the muted description must still meet AA contrast; the entries are marked
  up as a real list; the `<h1>` is the route-change focus-handoff target.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md)
  — Vitest + Testing Library for the component.
- [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md)
  — Playwright against the production build; the flagged Start+Playwright
  timing caveat.
- [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md),
  [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md),
  [../../research/accessibility/testing-and-tooling.md](../../research/accessibility/testing-and-tooling.md)
  — ratchet coverage; `@axe-core/playwright` inline on `/projects` in both
  themes.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)
  — the feature/task folder structure and per-task PR gating.
- [../../research/project-management-conventions/issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  — parent feature issue + task sub-issue, self-assignment, `Closes #` in the
  PR body.
- [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — Conventional Commits on PR titles.

## Notes / narrower research (feature-local, not global)

- **The entry ships as text, not a link — a deliberate temporal deviation.**
  The decided page spec
  ([projects.md](../../research/ui-ux/pages/site-wide/pages/projects.md))
  makes each entry "a single clickable link to that sub-application." That
  spec presumes the sub-application exists. It does not: the Literature
  Tracker is Phase 3, gated by `authentication` in Phase 2, and **no decided
  research doc assigns it a URL** — `monorepo-structure.md` fixes that it will
  be its own route subtree, not what path that subtree sits at.
  [../../research/ui-ux/pages/index.md](../../research/ui-ux/pages/index.md)
  further establishes that lit-tracker URLs are *protected*: a signed-out
  visitor hitting one is redirected to sign-in, which cannot happen before
  auth exists either.

  The options were: link to a URL that 404s; invent a "coming soon" page no
  spec covers; or render the entry as text until there is something to link
  to. The third was chosen (user decision, 2026-08-01): nothing on the live
  site then promises a destination that isn't there, and no invented content
  enters the design.

  **Follow-up owed:** the Phase 3 feature that creates the Literature Tracker
  route decides its URL and turns this entry into the single link the page
  spec describes, wrapping both the name and the description. The unit test
  asserting the entry exposes no link role is what forces that change to be
  deliberate rather than forgotten. Recorded here rather than as a global
  `research/` revision because the decided design is unchanged — only the
  moment it becomes reachable.
