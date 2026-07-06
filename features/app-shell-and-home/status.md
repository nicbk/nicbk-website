# Status: App Shell + Home Page

**Feature state:** In progress — first task implemented locally.

Feature parent issue:
[#1](https://github.com/nicbk/nicbk-website/issues/1); task sub-issues
#2–#6 (in roadmap order).

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `scaffold-tooling-and-ci` | **Merged** (2026-07-05) | #7 | ✅ (GitHub-hosted, temporary) | ✅ |
| `design-system-foundation` | **Merged** (2026-07-05) | #8 | ✅ | ✅ |
| `app-shell-and-header` | **Merged** (2026-07-06) | #9 | ✅ | ✅ |
| `home-page` | Implemented — PR open (#10, closes #5) | #10 | pending | — |
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
