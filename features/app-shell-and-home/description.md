# Feature: App Shell + Home Page

The project's walking skeleton: the first vertical slice, which stands up the
application shell every later feature builds on and delivers the personal
site's home page on top of it.

Concretely, this feature produces:

- A running **TanStack Start** application with file-based routing and the
  decided top-level project layout (`src/`, `routes/`, route groups, config
  files at repo root).
- The **design-system foundation** shared by every page: global CSS-custom-
  property tokens (colors, typography, spacing), self-hosted **JetBrains
  Mono**, light/dark theming via `data-theme` with no flash of the wrong
  theme, and Base UI + Lucide wired in.
- The **sticky site header** (site name → home, `projects`/`blog`/`about`
  nav, divider) used across all personal-site pages, plus the accessibility
  shell (skip-to-main-content link, focus handoff on client navigation).
- The **home page** itself: two static lines of content, no dynamic data.
- The **CI pipeline** (Biome, typecheck, tests, PR-title lint) that gates
  every task's PR, and the **app-server Docker/Compose** definition plus the
  pull-based deployment mechanism.

## Scope boundary

This slice covers only the layers the home page actually needs. Because the
personal site renders no reactive data, this feature deliberately does **not**
stand up Postgres, Zero/zero-cache, Garage, or GROBID — those are introduced
by the later features that first require them (`authentication` for
Postgres + Better Auth; `article-upload-and-extraction` for
Garage/GROBID/zero-cache/pg-boss). The Docker Compose file created here holds
only the app-server service and is written to be extended, not rewritten, by
those features.

The other static personal-site pages (about, projects, blog) and the
dedicated 404 / error-fallback pages are their own features
(see [../index.md](../index.md)); this feature wires only the minimal root
error/not-found boundary needed for the app to run.
