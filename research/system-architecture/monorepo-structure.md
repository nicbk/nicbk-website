# Monorepo / Codebase Structure

Researched: 2026-07-04. Decided: 2026-07-04.

How the personal site and lit-tracker (and future sub-apps) share one
codebase while staying distinct route trees. Code organization, not
deployment/process boundaries (see [service-topology.md](./service-topology.md),
which already established a single TanStack Start app server hosting
everything).

## Decision

**A single TanStack Start package — no multi-package monorepo tooling**
(no pnpm/npm workspaces, no Turborepo/Nx). The personal site, lit-tracker,
and any future sub-apps live in one package, separated by TanStack
Router's own file-based routing primitives (route groups and pathless
layout routes) rather than package boundaries.

Exact folder/naming conventions are left to `coding-conventions/` once that
category is reached — this decision is scoped to "one package vs. many,"
not the specific layout within it.

## Reasoning

- TanStack Router's file-based routing already provides what's needed to
  keep the personal site and lit-tracker visually/organizationally distinct
  within one package: route groups (folders that don't affect the URL) for
  purely organizational separation, and pathless layout routes for
  per-section shared layout (e.g. the lit-tracker's own fixed header from
  [../ui-ux/pages/lit-tracker/components/header.md](../ui-ux/pages/lit-tracker/components/header.md),
  distinct from the site-wide header). Routes are code-split automatically,
  so one section's code isn't bundled into another's.
- A real multi-package workspace adds tooling overhead (workspace config,
  package boundaries, build/publish ordering) with no benefit for a single
  developer shipping one deployable app — there's no independent
  deployment or independent versioning need to justify it.
- TanStack Start is a young framework with documented friction running
  inside pnpm/npm workspaces (module-resolution failures with pnpm's
  dependency flattening, since patched) — evidence that workspace setups
  are a less-trodden, higher-friction path for this framework specifically,
  reinforcing that a single package is the lower-risk choice right now.
- Extensibility: adding a third sub-app later is a same-day addition either
  way (one more route subtree). Migrating to a workspace later, if ever
  needed, is a deferrable, mechanical refactor — the reverse (ripping
  workspace tooling back out) would be more painful. Starting with a single
  package doesn't foreclose the option.

## Sources

- [tanstack.com/router/latest/docs/framework/react/routing/file-based-routing](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing) —
  route groups (parenthesized folder names, purely organizational, no URL
  segment).
- [tanstack.com/router/latest/docs/framework/react/routing/routing-concepts](https://tanstack.com/router/latest/docs/framework/react/routing/routing-concepts) —
  pathless layout routes (underscore-prefixed, wrap children in a shared
  layout without adding a URL segment).
- [tanstack.com/start/latest/docs/framework/react/guide/routing](https://tanstack.com/start/latest/docs/framework/react/guide/routing) —
  automatic per-route code-splitting.
- [github.com/TanStack/router/issues/5398](https://github.com/TanStack/router/issues/5398) —
  documented TanStack Start module-resolution failures inside pnpm
  workspaces (since fixed via #5409/#5408), evidence of added friction in
  workspace setups for this framework.
