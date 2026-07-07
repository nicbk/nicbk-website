# Status: Blog List Page

**State:** Not started (2026-07-06). Blocked on `mdx-pipeline-and-post-page`
(needs the frontmatter schema, the `import.meta.glob` data layer, and routable
post pages to link to).

- Branch: _not yet created_ (`blog/blog-list-page` when started).
- Sub-issue: [#25](https://github.com/nicbk/nicbk-website/issues/25)
  (parent [#23](https://github.com/nicbk/nicbk-website/issues/23)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Notes carried into implementation

- Extend the task-1 data layer with a **frontmatter-only** listing helper
  (lazy glob — no post bodies in the list bundle), sorted reverse-chron by
  `date`, `draft`-excluded in production.
- Replace the existing `/blog` placeholder route; add the page's own `head()`.
- Grid rows with aligned columns (date / title / description) + **inline
  tags**; muted token for date/description, primary for the title link.
- **Infinite scroll** is client-side progressive rendering of the static
  metadata list, not a network fetch.
- Empty state = plain inline text (no spinner/illustration).

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `mdx-pipeline-and-post-page`.
