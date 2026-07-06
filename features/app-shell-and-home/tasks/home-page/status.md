# Status: Home Page

**State:** Implemented — PR open, awaiting CI + human review.

- Branch: `app-shell-and-home/home-page`
- Sub-issue: [#5](https://github.com/nicbk/nicbk-website/issues/5), self-assigned
- PR: pending (`Closes #5`)
- CI: temporary GitHub-hosted runners (see the scaffold task's status.md)
- Human review: pending

## Verification done locally (2026-07-06)

- 38/38 unit tests — new `home-page.test.tsx` covers both content lines
  verbatim and the presence of a level-1 main heading, plus all prior
  suites.
- 10/10 Playwright e2e, run twice to check for flakiness — new
  `e2e/home.spec.ts` smoke (two lines + header visible; content renders
  after a theme toggle), plus the existing shell/theme suites. The shell
  suite's axe scan of `/` in both themes now scans the real home content.
- Biome and typecheck (cmk + tsc) clean; production build succeeds.

## Deviations / notes

- **The main heading is visually hidden**, not omitted. `home-page.png`
  shows no visible heading, but the task requires correct document heading
  structure and the shell's focus handoff targets `main h1` — so the page
  renders an `<h1>home</h1>` with the standard visually-hidden CSS pattern
  (still in the accessibility tree and programmatically focusable).
- **Component lives in `-components/home-page/`**, with `index.tsx` only
  wiring the route. This matches the site-header precedent, keeps the unit
  test file out of the route generator's scan path, and satisfies the 1:1
  component-to-module styling rule.
- **No new axe/no-flash e2e** — testing.md's axe-in-both-themes and
  no-flash requirements were already covered by `shell.spec.ts` and
  `theme.spec.ts` on `/`; duplicating them was avoided per AGENTS.md.

## Log

- 2026-07-06 — Claimed (#5), implemented on branch: replaced the shell
  task's placeholder home route with the final two-line content from
  `home-page.png`, visually hidden main heading, token-only CSS Module
  styling (header-aligned padding, no paragraph gaps). All local checks
  green; PR next.
