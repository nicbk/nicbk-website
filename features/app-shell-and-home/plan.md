# Plan: App Shell + Home Page

## Approach

Build the walking skeleton bottom-up: get a running, tooled, CI-gated project
first, then layer the design system, then the shell/header, then the home
page on top, and finally containerize and wire deployment. Each step is a
task that is independently mergeable and leaves the app in a working state.

The CI workflow is created in the very first task, because the decided
process gates every subsequent task's PR on CI — the gate has to exist before
there is a second PR to gate.

Infra scope is kept to exactly what the home page needs (app server only). No
data-layer services are introduced here; the Compose file is authored to be
extended by later features (see [description.md](./description.md)).

## Task breakdown and sequence

Tasks are sequential — one open at a time, each merged behind its own
PR + CI + human review before the next begins.

1. **[`scaffold-tooling-and-ci`](./tasks/scaffold-tooling-and-ci/description.md)**
   — Initialize the TanStack Start project and the decided top-level layout,
   TypeScript (`strict` + agreed extras), Biome, the Zod-validated `env.ts`,
   Vitest, and the GitHub Actions CI workflow (lint/format, typecheck, unit
   tests, PR-title Conventional-Commits lint) on the self-hosted runner. Exit
   state: `npm run dev` serves an empty root route; CI is green on the PR.

2. **[`design-system-foundation`](./tasks/design-system-foundation/description.md)**
   — Global token stylesheets (`colors.css`/`typography.css`/`spacing.css`
   combined by `globals.css`), self-hosted JetBrains Mono, light/dark theming
   (`data-theme` + inline no-flash script + `prefers-color-scheme` +
   `localStorage`), reduced-motion default-off, and Base UI + Lucide wired in.
   Exit state: tokens and theming are usable by any component; theme toggle
   works with no flash.

3. **[`app-shell-and-header`](./tasks/app-shell-and-header/description.md)**
   — `__root.tsx`, `router.tsx`, the `(personal-site)` route group, the
   sticky site header component, the skip-to-main-content link, focus handoff
   on client-side navigation, and the minimal root error/not-found boundary.
   Exit state: every personal-site route renders inside the header shell and
   is keyboard-navigable.

4. **[`home-page`](./tasks/home-page/description.md)**
   — The `(personal-site)/index.tsx` home route: the two static content lines
   under the header, styled from the design tokens, with correct heading
   semantics and focus target. Exit state: the home page matches
   `home-page.png`.

5. **[`containerization-and-deployment`](./tasks/containerization-and-deployment/description.md)**
   — The multi-stage app-server `Dockerfile`, `docker-compose.yml` +
   `docker-compose.override.yml` (app service only, extensible), the
   pull-based deployment timer, and the extension of CI with Playwright e2e
   smoke + `@axe-core/playwright` + ratchet coverage. Exit state: `docker
   compose up` serves the home page with HMR locally and the production build
   runs from `.output/server/index.mjs`.

## Sequencing rationale

- CI-first (task 1) so the per-task gate exists from the first PR onward.
- Design system before shell/header before home page: each consumes the
  previous — the header needs tokens/theming; the home page needs the header.
- Containerization/deployment last: it packages and ships a working app
  rather than blocking earlier UI work, and it extends (not rewrites) the CI
  workflow task 1 established.
