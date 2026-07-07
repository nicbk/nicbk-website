# Task: Blog List Page

Replace the `/blog` placeholder with the real reverse-chronological list,
matching [blog-page.png](../../../../high-level-guidance/design/blog-page.png)
and [blog-list.md](../../../../research/ui-ux/pages/site-wide/pages/blog-list.md),
on top of the pipeline shipped by `mdx-pipeline-and-post-page`.

## What this task does — concretely

- **Frontmatter-only listing helper.** Extend the task-1 data layer (`blog/
  posts.ts`) with a helper that returns **frontmatter/metadata only** for every
  post — using the **lazy** glob so post bodies are not bundled into the list —
  sorted reverse-chronologically by `date`, with `draft: true` posts excluded
  in the production build.
- **List route + component.** Replace `src/routes/(personal-site)/blog.tsx`
  (currently a placeholder) with the real route wiring a colocated
  `-components/blog-list-page/` component. The route sets its own `head()`
  (document `<title>` + `meta name="description"` for the blog index).
- **Row layout.** Render a **CSS grid** of one row per post, columns aligned
  down the page: **date** (muted token) / **title** (primary color/weight,
  linking to `/blog/<slug>`) / **one-line description** (muted token), with
  **tags shown inline** after the description (not a pill/badge). The whole
  row's title (at minimum) links to the post.
- **Infinite scroll.** Progressive rendering of the static metadata list (an
  `IntersectionObserver`-style incremental reveal), not numbered pagination and
  not a network fetch — the full metadata set is already available client-side.
- **Empty state.** If there are no non-draft posts, render plain inline text
  (no illustration, no spinner), per the design system's reactive-feedback
  default.
- **Main heading.** A heading the shell's focus handoff can target (following
  the home/about page precedent for the visually-hidden-or-visible main
  heading).

## Not in this task

- **Search and tag filtering** (task 3) — this task ships the plain list; the
  search bar and tag sidebar are added next, over this list.
- The post page and the MDX pipeline (task 1).
- Sitemap/RSS/structured data (out of scope for the whole feature).
