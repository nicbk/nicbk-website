# Constraints and Behavior: projects-page-content

This is the feature's only task, so it satisfies **every** criterion in the
parent's [constraints-and-behavior.md](../../constraints-and-behavior.md).
Restated here only as the concrete, checkable exit conditions for this task:

## Done when

- `/projects` renders a single `<h1>` reading "projects", styled like the
  about and blog page titles, and the shell's focus handoff moves focus to it
  on client navigation (the existing `shell.spec.ts` assertion still passes,
  now against the real page).
- Below the heading, a list containing exactly one entry: the name **Academic
  Literature Tracker** followed by a one-line description in
  `--color-text-muted`.
- The entry exposes **no link role** and carries no interactive affordance
  (no underline, pointer cursor, or hover style).
- The entries are marked up as a real list (`<ul>`/`<li>`), so assistive
  technology announces a list of one item rather than loose text.
- No card, grid, badge, thumbnail, or metadata beyond name + description.
- The old placeholder component no longer exists anywhere in the tree, and
  `src/routeTree.gen.ts` is regenerated for the moved route file with the
  `/projects` URL unchanged.
- Correct in both light and dark themes; no horizontal page overflow at a
  narrow (mobile) viewport; the entry wraps rather than forcing sideways
  scroll.
- WCAG 2.2 AA: valid heading structure, and the muted description meets 4.5:1
  against the page background in both themes.
- Full gate green: Biome, `npm run typecheck`, unit tests, Playwright e2e +
  axe against the production build.
