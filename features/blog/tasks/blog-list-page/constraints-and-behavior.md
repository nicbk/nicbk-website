# Constraints and Behavior: Blog List Page

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md) — the
"Blog list page" section, its `head()` metadata, plus the cross-cutting quality
bar):

- `/blog` renders a **flat, reverse-chronological** (newest first by `date`)
  list matching `blog-page.png`: a CSS grid whose date / title / description
  columns align down the page, with **tags inline** after the description.
- Dates and descriptions use the muted/secondary text token; titles use the
  primary color/weight and link to `/blog/<slug>`.
- **Draft posts are excluded** from the production list.
- **Infinite scroll** — progressive rendering of the static metadata list, not
  numbered pagination and not a server round-trip.
- The list bundles **frontmatter only** — no post body is pulled into the list
  page (the lazy-glob contract from task 1 is honored).
- **Empty state:** with no non-draft posts, plain inline text (no illustration,
  no spinner).
- The route sets its own document `<title>` and `meta name="description"`.
- Valid heading structure with a main heading the shell's focus handoff can
  target; renders inside the existing sticky header shell, correct in both
  themes.
- WCAG 2.2 AA: row/link contrast and visible focus indicators in both themes;
  each post link has a discernible accessible name; the grid remains legible and
  the reading order sensible.

## Behavior details

- **Ordering is by frontmatter `date`**, the single source of truth — the
  folder name carries no date and is not used for ordering.
- **No eager bundling:** the list must not import post bodies; a regression here
  would silently bloat the list bundle (the explicitly-flagged Vite+MDX
  mistake).
- Identical under `npm run dev` and the production Nitro server.

## Dependencies

- **`mdx-pipeline-and-post-page`** — provides the frontmatter schema/type, the
  `import.meta.glob` post-discovery data layer this task extends with a
  frontmatter-only listing helper, and the routable post pages each row links
  to.
- The shell/header/tokens/theming from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md).

## Provides to later tasks

- The rendered list surface and its frontmatter-only listing helper, which
  `blog-search-and-filter` (task 3) filters over.
