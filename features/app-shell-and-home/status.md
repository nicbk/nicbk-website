# Status: App Shell + Home Page

**Feature state:** In progress — first task implemented locally.

Feature issue / task sub-issues not opened yet: no GitHub remote or `gh` CLI
on this machine (see the first task's status.md).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `scaffold-tooling-and-ci` | Implemented, awaiting PR gate | blocked on GitHub setup | workflow authored | — |
| `design-system-foundation` | Not started | — | — | — |
| `app-shell-and-header` | Not started | — | — | — |
| `home-page` | Not started | — | — | — |
| `containerization-and-deployment` | Not started | — | — | — |

## Definition of Done (feature)

A rollup of all task acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) being met and
each task merged behind its own passing CI + human review. In short: the home
page renders per `home-page.png` inside the sticky header, in both themes with
no flash, keyboard/screen-reader navigable at WCAG 2.2 AA, running identically
under `npm run dev` and `docker compose up`, with CI green and the deploy
timer live.

## Log

- 2026-07-05 — `scaffold-tooling-and-ci` implemented on branch
  `app-shell-and-home/scaffold-tooling-and-ci`; all local checks green
  (Biome, typecheck, unit tests, dev server, env fail-fast, pre-commit
  hook). PR/CI/review gate pending GitHub repo + self-hosted runner setup.
