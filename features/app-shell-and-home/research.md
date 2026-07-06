# Research Traceability: App Shell + Home Page

Every decision this feature implements traces to an already-decided
`research/*.md` doc or a `high-level-guidance/design/*.md` line. No decision
is improvised here; if a gap were found, it would be resolved in `research/`
first (per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)).

## High-level design

- [../../high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md)
  — minimalist, monospace/techy feel (lines 9–16); the site is a personal
  blog + sub-app host with a simple home/about/projects page (line 40);
  match `home-page.png`; open-source-only components (lines 20–24); shared
  infrastructure across sub-apps (lines 26–30).
- [../../high-level-guidance/design/home-page.png](../../high-level-guidance/design/home-page.png)
  — the exact home-page content and layout.

## Stack and framework

- [../../research/technologies/frontend-framework.md](../../research/technologies/frontend-framework.md)
  — TanStack Start.
- [../../research/technologies/index.md](../../research/technologies/index.md)
  — the stack overview (Base UI/Lucide are UI-UX decisions; data-layer
  technologies are intentionally not consumed by this feature).

## Layout, conventions, and code style

- [../../research/coding-conventions/file-hierarchy-and-complexity.md](../../research/coding-conventions/file-hierarchy-and-complexity.md)
  — the concrete top-level layout (`src/`, `routes/` with `-`-prefix
  colocation, root-level config, `src/styles/`, `src/env.ts`), and the
  Zod-`env.ts` fail-fast pattern.
- [../../research/coding-conventions/naming-and-casing.md](../../research/coding-conventions/naming-and-casing.md)
  — kebab-case files/route-group folders, PascalCase components/types.
- [../../research/coding-conventions/component-and-export-conventions.md](../../research/coding-conventions/component-and-export-conventions.md)
  — named exports only, function-declaration components, `FooProps`,
  within-file ordering.
- [../../research/coding-conventions/typescript-conventions.md](../../research/coding-conventions/typescript-conventions.md)
  — `strict` + agreed extras, `interface`-for-shapes/`type`-for-unions.
- [../../research/coding-conventions/formatting-and-linting.md](../../research/coding-conventions/formatting-and-linting.md)
  — Biome, pre-commit hook + CI gate.
- [../../research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — 1:1 component-to-`.module.css`, global tokens split by category combined
  via `globals.css`, `[data-theme]` in `colors.css`.
- [../../research/coding-conventions/state-management-conventions.md](../../research/coding-conventions/state-management-conventions.md)
  — no global state library; theme bypasses React (inline script +
  `data-theme` + `localStorage`).
- [../../research/coding-conventions/import-conventions.md](../../research/coding-conventions/import-conventions.md)
  — relative vs `~/` alias, Biome `organizeImports` grouping.

## Design system

- [../../research/ui-ux/design-system.md](../../research/ui-ux/design-system.md)
  — CSS Modules, Base UI, self-hosted JetBrains Mono, light/dark theming via
  `data-theme` defaulting to `prefers-color-scheme` with a persistent toggle,
  reactive-feedback baseline, responsive/mobile conventions, Lucide icons,
  and the overarching simplicity/low-friction philosophy.
- [../../research/ui-ux/pages/site-wide/pages/home.md](../../research/ui-ux/pages/site-wide/pages/home.md)
  — the home page's two static lines and "no other layout elements."
- [../../research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — the sticky site header structure, no-auth-UI, no active-page indication,
  single-row-at-all-widths, `clamp()` sizing.

## System architecture

- [../../research/system-architecture/monorepo-structure.md](../../research/system-architecture/monorepo-structure.md)
  — single TanStack Start package; sub-apps separated via route groups/
  pathless layouts, not package boundaries.
- [../../research/system-architecture/service-topology.md](../../research/system-architecture/service-topology.md)
  — single-node topology (this feature stands up only the app-server piece).

## Accessibility

- [../../research/accessibility/conformance-target.md](../../research/accessibility/conformance-target.md)
  — WCAG 2.2 AA, site-wide.
- [../../research/accessibility/color-contrast-and-focus-visibility.md](../../research/accessibility/color-contrast-and-focus-visibility.md)
  — 4.5:1 / 3:1 contrast, both themes audited; ≥2px / 3:1 focus indicators
  via Base UI `data-focus-visible`.
- [../../research/accessibility/keyboard-and-focus-management.md](../../research/accessibility/keyboard-and-focus-management.md)
  — skip-to-main-content link; focus handoff to the new page heading on
  client navigation.
- [../../research/accessibility/semantic-markup-and-aria-conventions.md](../../research/accessibility/semantic-markup-and-aria-conventions.md)
  — Base UI primitives over hand-rolled ARIA; accessible-name convention.
- [../../research/accessibility/motion-and-reduced-motion.md](../../research/accessibility/motion-and-reduced-motion.md)
  — motion opt-in via `prefers-reduced-motion: no-preference`, SSR-off by
  default.

## DevOps / build / CI / deployment

- [../../research/devops-deployment/containerization-and-build.md](../../research/devops-deployment/containerization-and-build.md)
  — multi-stage Dockerfile (`dev`/`build`/`runner`), `docker-compose.yml` +
  `docker-compose.override.yml`, npm, `node:<version>-slim`,
  `.output/server/index.mjs` entry point.
- [../../research/devops-deployment/hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md)
  — unified `docker-compose.yml` run identically locally (OrbStack) and in
  prod; Caddy/ACME NixOS-native.
- [../../research/devops-deployment/ci-pipeline.md](../../research/devops-deployment/ci-pipeline.md)
  — GitHub Actions on a self-hosted Sysbox-isolated runner; Biome, typecheck,
  test suite, PR-title Conventional-Commits lint, `pull_request`-only trigger.
- [../../research/devops-deployment/deployment-strategy.md](../../research/devops-deployment/deployment-strategy.md)
  — pull-based deploy timer polling `origin/main`; on-host build.
- [../../research/devops-deployment/secrets-and-environment-config.md](../../research/devops-deployment/secrets-and-environment-config.md)
  — git-ignored `.env` provisioned on host; `.env.example` committed; CI
  needs zero GitHub-side secrets.

## Testing

- [../../research/testing-qa/test-runner-and-frameworks.md](../../research/testing-qa/test-runner-and-frameworks.md)
  — Vitest + `@testing-library/react`/jsdom; thin-wrapper convention for
  `createServerFn`.
- [../../research/testing-qa/e2e-testing.md](../../research/testing-qa/e2e-testing.md)
  — Playwright; assert on DOM state; the flagged Start+Playwright hydration/
  routing-timing flakiness to design around.
- [../../research/testing-qa/test-coverage-and-ci-gating.md](../../research/testing-qa/test-coverage-and-ci-gating.md)
  — `v8` coverage, unit-only, ratchet-style, HTML report as CI artifact.
- [../../research/testing-qa/accessibility-testing.md](../../research/testing-qa/accessibility-testing.md)
  and
  [../../research/accessibility/testing-and-tooling.md](../../research/accessibility/testing-and-tooling.md)
  — `@axe-core/playwright` inline in e2e via a shared fixture, blocking on
  critical/serious; Biome `a11y` lint rules.

## Project-management process

- [../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md)
  — the feature/task folder structure and per-task PR gating this feature is
  organized by.
- [../../research/project-management-conventions/commit-message-conventions.md](../../research/project-management-conventions/commit-message-conventions.md)
  — Conventional Commits on the PR title (the CI PR-title lint step).

## Notes / narrower research

None beyond the cited docs. No decision gap was found while scoping this
feature; all needed decisions already exist in `research/`.
