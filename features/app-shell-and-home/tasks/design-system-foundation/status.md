# Status: Design-System Foundation

**State:** Implemented — PR open, awaiting CI + human review.

- Branch: `app-shell-and-home/design-system-foundation`
- Sub-issue: [#3](https://github.com/nicbk/nicbk-website/issues/3), self-assigned
- PR: #8 (`Closes #3`)
- CI: temporary GitHub-hosted runners (see the scaffold task's status.md)
- Human review: pending

## Verification done locally (2026-07-05)

- 33/33 unit tests: theme resolver (stored override / OS fallback / garbage
  input), toggle flip + persistence, the inline script evaluated verbatim,
  a 20-case WCAG contrast audit of both palettes (4.5:1 text, 3:1 non-text
  and focus, against both surfaces), and Base UI + Lucide render/styling
  sanity checks.
- Dev server: inline theme script and the single `globals.css` stylesheet
  both SSR into `<head>`; every font URL is local (zero external requests);
  the served CSS contains the JetBrains Mono Variable `@font-face`.
- Production build succeeds; fonts bundle as hashed local assets.
- Typo-safety of CSS Module class names verified: `styles.tpyo` fails
  `npm run typecheck` with TS2339.

## Deviations / notes

- **Base UI package renamed:** the task description's
  `@base-ui-components/react` is deprecated on npm ("Package was renamed");
  the current package is `@base-ui/react` (1.6.0), which is what's
  installed.
- **CSS Modules vs `noPropertyAccessFromIndexSignature` (TS4111):** genuine
  conflict between two decided conventions, resolved with the user
  (2026-07-05) by adding `@css-modules-kit/codegen` — exact-key `.d.ts`
  generation for every CSS Module (`cmk`, runs inside `npm run typecheck`;
  output in gitignored `generated/`). Recorded as an addendum in
  `research/coding-conventions/typescript-conventions.md`.
- **Theme toggle is a native `<button>`, not a Base UI primitive:** Base
  UI's Toggle models pressed state in React, but theme state deliberately
  lives outside React (decided convention), and a native button has correct
  semantics with no hand-rolled ARIA — so the "Base UI over hand-rolled
  ARIA" rule isn't implicated. Base UI wiring is proven by unit test
  (Separator primitive); the header task consumes it for real.
- **No-JS visitors get the light theme** regardless of OS preference (no
  `data-theme` attribute is ever set without JS). Accepted rather than
  duplicating the dark palette into a `prefers-color-scheme` media-query
  block that would have to be kept in sync by hand.
- **e2e (no-flash, persistence across reload) deferred** to the
  app-shell-and-header task per this task's testing.md — Playwright isn't
  set up yet and the theme-logic unit tests are this task's primary gate.
- **For task 5:** current TanStack Start builds to `dist/server/server.js`,
  not the `.output/server/index.mjs` recorded in
  `research/devops-deployment/containerization-and-build.md` — re-verify
  the entry point when writing the Dockerfile.

## Log

- 2026-07-05 — Claimed (#3), implemented on branch: token stylesheets
  (colors/typography/spacing/motion + globals entry), self-hosted JetBrains
  Mono variable font via @fontsource-variable, pre-paint inline theme
  script sharing one resolver with the accessible theme toggle
  (`routes/-shared/components/theme-toggle/`), reduced-motion opt-in
  convention, responsive baseline conventions documented, Base UI + Lucide
  wired and verified, WCAG contrast audit encoded as a unit test. All local
  checks green.
