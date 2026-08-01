# Status: projects-page-content

**State:** Merged (2026-08-01). The only task of
[`projects-page`](../../status.md); built on `main` at `2ae98da`.

- Branch: `projects-page/projects-page-content`.
- Sub-issue: [#54](https://github.com/nicbk/nicbk-website/issues/54)
  (parent [#53](https://github.com/nicbk/nicbk-website/issues/53)).
- PR: [#55](https://github.com/nicbk/nicbk-website/pull/55) — CI green,
  approved, merged.

## What was implemented

- **Route.** `(personal-site)/projects.tsx` (the placeholder) became
  `(personal-site)/projects/route.tsx`, so the page component can colocate
  beside it as `-projects-page/` — the same shape as `about/route.tsx` +
  `about/-about-page/`. The URL, route id, and typed `<Link to="/projects">`
  are unchanged; `routeTree.gen.ts` regenerated accordingly.
- **Page.** `-projects-page/projects-page.tsx`: a "projects" `<h1>` (the
  focus-handoff target) over a `<ul>` of entries, each a name plus a one-line
  description. Entries are a module-level `PROJECTS` array, so a second
  sub-application is a new entry rather than new markup.
- **Content.** One entry: "Academic Literature Tracker" / "upload papers, read
  and annotate them, and track reading progress" (from the tracker's design
  doc).
- **Styling** (`projects-page.module.css`): name and description in two
  aligned grid columns — the row shape `blog-page.png` shows and the blog list
  already implements. The description caps at a 60ch measure so wide screens
  don't stretch it, and below 40rem each entry stacks (name, then description)
  before the description would collapse into a sliver.

## Decisions

- **Two columns, not one inline run.** The first pass rendered name and
  description in a single inline flow, exactly as
  [projects.md](../../../../research/ui-ux/pages/site-wide/pages/projects.md)
  reads ("description immediately after"). Viewed in Chrome it read as one
  run-on phrase — "Academic Literature Tracker upload papers…" — because color
  was the only separation. The mockup the spec cites
  (`blog-page.png`) in fact separates its own primary/secondary text with
  aligned columns, so the entry adopts that same shape. Same content, same
  color convention, legible boundary.
- **The entry is text, not a link** — the Literature Tracker has no route and
  no decided URL. Reasoning and the follow-up owed in the feature's
  [research.md](../../research.md).

## Verification

- `npm run lint` ✓, `npm run typecheck` ✓, **166 unit tests** ✓ (4 new:
  single `<h1>`, entry name + description, list semantics, and no link role).
- **52 Playwright e2e** ✓ against the production build (4 new in
  `e2e/projects.spec.ts`: shell smoke, no link inside `<main>`,
  narrow-viewport overflow, axe in both themes). The existing `shell.spec.ts`
  header-nav and focus-handoff assertions pass unchanged against the real
  page.
- The "no link inside `<main>`" assertion was checked to be non-vacuous: the
  same selector counts 5 links on `/about` and 3 on `/blog`, 0 on `/projects`.
- **Chrome:** viewed in both themes at 1440 / 1024 / 700 / 640 / 500 / 375 px.
  No horizontal overflow at any width; two columns down to 640px, stacked
  below it; description capped at 576px (60ch) on wide screens. Muted
  description resolves to `rgb(89,89,89)` on white and `rgb(176,176,176)` on
  `rgb(38,38,38)` — both above 4.5:1. Navigating from the header's `projects`
  link lands on `/projects` with focus handed to the `<h1>`; the entry has no
  pointer cursor, no underline, and nothing focusable inside `<main>`.

## Log

- 2026-08-01 — Feature spec'd and this task implemented on
  `projects-page/projects-page-content` (#54 self-assigned). Full gate green;
  verified in Chrome across themes and widths. Awaiting PR + CI + review.
- 2026-08-01 — **Merged as [#55](https://github.com/nicbk/nicbk-website/pull/55)**
  (CI green, approved).
