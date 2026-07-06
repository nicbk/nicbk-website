# Constraints and Behavior: App Shell + Home Page

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## Project structure and tooling

- The repository follows the decided top-level layout: `src/` wrapper,
  `routes/` for file-based routing with `-`-prefixed colocation, config files
  (`Dockerfile`, `docker-compose.yml`, `biome.json`, `tsconfig.json`,
  `vite.config.ts`, `package.json`) at the repo root, `src/styles/`,
  `src/env.ts`.
- TypeScript runs in `strict` mode plus the agreed low-friction extras
  (e.g. `noUncheckedIndexedAccess`), and the build/typecheck is clean.
- Biome is the single formatter/linter; a pre-commit hook autofixes staged
  files and CI runs the full project-wide check as the real gate.
- `src/env.ts` validates `process.env` with Zod and is imported first at the
  server entry, so missing/invalid configuration fails at startup, not first
  use. `.env.example` is committed; `.env` is gitignored.
- Naming follows the decided conventions (kebab-case files/route-group
  folders, PascalCase components/types, named exports only).

## Design system

- A shared set of CSS-custom-property tokens (colors, typography, spacing)
  lives in `src/styles/` and is imported once from `__root.tsx`; component
  styling is CSS Modules that pull from these tokens.
- The site renders in **JetBrains Mono**, self-hosted (no external font CDN
  request).
- Both light and dark themes exist, default to the OS `prefers-color-scheme`,
  and are overridable by a persistent manual toggle. Theme is applied via a
  `data-theme` attribute set by an inline script before first paint, so there
  is **no flash** of the wrong theme, and the choice survives reloads via
  `localStorage`. Theming does not go through React state.
- Motion is opt-in via `prefers-reduced-motion: no-preference`; a
  reduced-motion user never sees a flash of motion after hydration.
- Base UI is the primitive library and Lucide the icon set; any interactive
  widget with a Base UI equivalent uses it rather than hand-rolled ARIA.

## Shell, header, and navigation

- Every personal-site page renders inside the sticky site header: bold site
  name ("Nicolás Kennedy") on the left linking to home, `projects`/`blog`/
  `about` nav links to the right in a single row, a thin divider below. The
  header stays fixed on scroll and remains a single row at all widths (no
  hamburger); font size may shrink via `clamp()` on very narrow screens.
- The header contains **no auth UI** (the personal site has no sign-in) and
  shows no active-page indication.
- A skip-to-main-content link is the first focusable element; on client-side
  route changes, focus is explicitly moved to the new page's main heading.
- The app has a working root error boundary and not-found handling
  (minimal — the full 404 / error-fallback pages are a separate feature).

## Home page

- The home page displays exactly the two static lines from `home-page.png`
  (`who: ...` / `doing: ...`), with no dynamic data and no other layout
  elements beyond the shared header.
- It has a correct document heading structure and is fully keyboard- and
  screen-reader-navigable.

## Cross-cutting quality

- WCAG 2.2 AA: 4.5:1 text / 3:1 non-text contrast in both themes, visible
  ≥2px / 3:1-contrast focus indicators, accessible names on all controls.
- Runs identically via `npm run dev` and `docker compose up` (HMR in both);
  the production image runs from TanStack Start's
  `.output/server/index.mjs`.
- CI (Biome, typecheck, unit tests with ratchet coverage, Playwright e2e
  smoke, axe checks, PR-title lint) passes; the pull-based deploy timer
  redeploys `main` on the host.

## Explicitly out of scope

- Any data-layer service (Postgres, Zero/zero-cache, Garage, GROBID) and
  anything that reads/writes reactive data.
- The about, projects, and blog pages; the dedicated 404 / error-fallback
  pages; any authentication or Lit Tracker functionality.
