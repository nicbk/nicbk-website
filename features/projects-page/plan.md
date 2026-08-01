# Plan: Projects Page

## Approach

One task. The page is pure static presentation over content that already
exists in `high-level-guidance/`, rendered inside a shell, header, token set,
and page-component pattern that three merged features already ship. There is
no plumbing to land first (contrast with `about-page`, whose page had to wait
on real GPG artifacts), so splitting this into multiple tasks would produce
tasks that are not independently demoable.

The work is therefore: replace the `/projects` placeholder route with the real
page, following the `about-page` precedent exactly — a colocated
`-projects-page/` component with its own CSS Module styled from tokens, an
`<h1>` that doubles as the route-change focus-handoff target, and unit + e2e +
axe coverage.

## Task breakdown and sequence

1. **[`projects-page-content`](./tasks/projects-page-content/description.md)**
   — Convert `src/routes/(personal-site)/projects.tsx` (the placeholder) into
   `projects/route.tsx` plus a colocated `-projects-page/` component rendering
   the "projects" heading and the entry list, with the Literature Tracker as
   its single entry. Exit state: `/projects` shows the real list in both
   themes at every supported width, with no placeholder left in the tree.

## Sequencing rationale

Nothing to sequence — a single task. It depends only on already-merged work
(`app-shell-and-home` for the shell/header/tokens/focus handoff), so it can be
implemented immediately and in isolation from any other feature's file
footprint: the only files outside `features/` it touches are the `/projects`
route and its new colocated folder.
