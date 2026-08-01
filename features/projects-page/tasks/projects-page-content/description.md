# Task: projects-page-content

Replace the `/projects` placeholder route with the real projects page.

Concretely:

- **Route.** `src/routes/(personal-site)/projects.tsx` — currently a stub
  rendering `<h1>projects</h1>` so the header's typed `<Link to="/projects">`
  resolves — becomes `src/routes/(personal-site)/projects/route.tsx`, whose
  component is the new page. Same URL, same route id; the placeholder
  component is deleted, not left beside the real one. (The folder form matches
  `about/route.tsx` + `about/-about-page/`, which is what lets the page
  component colocate with its route.)
- **Page component.** `projects/-projects-page/projects-page.tsx` plus its
  colocated `projects-page.module.css`: a "projects" `<h1>` (styled like the
  about and blog page titles) over a `<ul>` of entries. Each entry renders a
  name and, after it, a one-line description in `--color-text-muted`.
- **Content.** One entry: **Academic Literature Tracker**, described in a
  single line derived from
  [lit-tracker/DESIGN.md](../../../../high-level-guidance/design/lit-tracker/DESIGN.md)
  — upload papers, read and annotate them, and track reading progress.
- **The entry is text, not a link** (see the parent feature's
  [research.md](../../research.md)): the Literature Tracker has no route and
  no decided URL yet, so there is nothing to link to. Nothing in the markup or
  styling may suggest interactivity — no underline, no pointer cursor, no
  hover style.
- **Tests.** Unit tests for the component and an `e2e/projects.spec.ts`
  covering the smoke path, the absence of a dead link, narrow-viewport
  overflow, and axe in both themes.

Everything the page renders inside — the sticky header shell, the design
tokens, the theming, the route-change focus handoff onto the `<h1>` — already
exists and is reused unchanged.

## Not in this task

Nothing is deferred to a later task: this feature has only this one. The
Literature Tracker itself, its URL, and converting this entry into a link
belong to the Phase 3 feature that creates the tracker.
