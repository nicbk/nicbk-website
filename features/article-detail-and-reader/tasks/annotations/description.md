# Task: Annotations

**Fourth of five.** The marks.

This task is the one the tracker's design brief names: *"the user can view the
article through a built-in reader interface which allows the user to also markup
the document with annotations (these annotations get persisted)."* It adds the
`annotations` table, its mutators, the toolbar's annotation tools, and the
bridge between EmbedPDF's in-memory annotation state and this project's synced
database.

Task 3 deliberately shipped a view-only reader so that this diff is almost
entirely about persistence and ownership, the same way #8's task 1 was read-only
so its task 2 could be about mutators.

## What it does

- **The `annotations` table**, exactly as
  [annotations-schema.md](../../../../research/data-modeling/annotations-schema.md)
  specifies — `id`, `user_id`, `article_id`, `type`, `page_index`, `contents`,
  `payload jsonb`, timestamps, and the `(article_id, page_index)` index — added
  to the **`zero_data` publication** and **`drizzle-zero.config.ts` in the same
  migration**, with `src/zero/schema.gen.ts` regenerated.
- **The mutators**: create, update, and delete an annotation, each authorized
  server-side against `zeroContextFrom(session)` and never against its own
  arguments. Same rule, same reason, as every mutator #8 wrote.
- **The query**: this article's annotations, scoped by user, added to
  `src/zero/queries.ts` alongside the ones already there.
- **The toolbar's annotation tools** — the **12 decided types** (highlight,
  underline, strikeout, squiggly, ink, square, circle, line, polyline, polygon,
  free text, sticky note), with **tool-select-then-apply** and the tool
  **staying active** for repeated use until switched or deselected. Stamp is out
  of scope by decision.
- **The bridge, in both directions.** Existing annotations are **imported into
  the reader when the document loads**, so a paper opens with its marks already
  on it rather than acquiring them a moment later. New and changed marks are
  **persisted from EmbedPDF's annotation events**.
- **The committed-only rule.** EmbedPDF's annotation events carry a `committed`
  flag distinguishing a finished change from an in-progress one. Only committed
  changes are written. Without this, dragging one ink stroke writes a row per
  animation frame — through an optimistic client, a websocket, and Postgres.
  This is the single most important line of this task.
- **A translation layer thin enough to be checkable.** An EmbedPDF annotation
  becomes a row by promoting `type`, `page_index`, and `contents` and putting
  everything type-specific in `payload`; a row becomes an EmbedPDF object with
  `author` and timestamps populated **from the row** rather than stored. Both
  directions are pure functions with their own tests, because they are the part
  of this task that can be wrong quietly.

## What it does not do

- **No annotations list in the sidebar.** Task 5 — deliberately separate, so a
  new synced table is not reviewed alongside a list UI.
- **No undo/redo** and no history plugin. Out of scope by decision.
- **No stamp annotations**, the one type needing binary payload storage.
- **No annotation export** to a marked-up PDF. The decided model keeps
  annotations beside the binary and never rewrites it.
- **No cross-user visibility.** Every annotation has exactly one possible
  author, the owning user.

## Exit state

A user highlights a passage and circles a figure, and both are on the paper in
another open window and still there after a reload — with the server proven to
refuse a write aimed at an article or an annotation the user does not own.
