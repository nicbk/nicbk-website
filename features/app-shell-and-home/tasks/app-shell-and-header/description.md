# Task: App Shell and Header

Assemble the application shell that every personal-site page renders inside:
the root document, the router, the `(personal-site)` route group, the sticky
site header, and the accessibility scaffolding (skip link, focus handoff).

## What this task does — concretely

- Flesh out `src/routes/__root.tsx` and `src/router.tsx`: the root document
  (html/head/body, the pre-paint theme script slot from the design-system
  task, `globals.css` import), the `<main>` landmark, and the shared shell
  layout.
- Create the `(personal-site)` route group as the container for the site's
  static pages, per the route-group separation convention.
- Build the sticky **site header** component (in the personal-site feature's
  colocated components): bold site name "Nicolás Kennedy" on the left linking
  to home, `projects` / `blog` / `about` nav links to its right in a single
  row, a thin divider below. Sticky/fixed on scroll; single row at all widths
  (no hamburger); font may shrink via `clamp()` on very narrow screens. No
  auth UI, no active-page indication.
- Add the **skip-to-main-content** link as the first focusable element, and
  implement **focus handoff**: on TanStack Router client-side navigation,
  move focus to the destination page's main heading.
- Wire a minimal root **error boundary** and **not-found** handler so the app
  degrades gracefully — placeholder only; the designed 404 / error-fallback
  pages are the separate `error-and-not-found` feature.

## Not in this task

- The home page's content (next task) — this task can render a trivial
  placeholder inside the shell to exercise it.
- The full 404 / error-fallback page designs.
- About / projects / blog pages.
