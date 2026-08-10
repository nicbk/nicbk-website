# Constraints and Behavior: Annotations

The subset of
[the feature's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies.

## Schema

- `annotations` is declared in Drizzle and migrated through the existing
  pipeline, exactly as
  [annotations-schema.md](../../../../research/data-modeling/annotations-schema.md)
  specifies: `id`, `user_id`, `article_id`, `type`, `page_index`, `contents`,
  `payload jsonb`, `created_at`, `updated_at`, plus the
  `(article_id, page_index)` index.
- **UUIDv7 primary keys generated on the client**, `timestamptz` timestamps,
  hard deletes, and **`ON DELETE CASCADE` on both foreign keys** — both are
  ownership relationships, per
  [zero-schema-conventions.md](../../../../research/data-modeling/zero-schema-conventions.md).
- **Only `type`, `page_index`, and `contents` are promoted to columns.**
  Everything type-specific stays in `payload`, mirroring EmbedPDF's own object
  shape so the translation layer stays thin. **`page_index` must not be buried
  in the JSON** — task 5's jump-to-page reads it.
- **Neither EmbedPDF's `author` nor its `created`/`modified` are persisted.**
  The row's `user_id` and its own timestamps serve both, populated onto the
  object handed back at read time.
- The table is added to the **`zero_data` publication** and to
  `drizzle-zero.config.ts` **in the migration that creates it**, and
  `src/zero/schema.gen.ts` is regenerated. CI's drift check catches the last
  step, not the first two.

## Writes and authorization

- The client writes through **Zero custom mutators** in `src/zero/mutators.ts`,
  executed by the existing `/mutate` endpoint. **No new REST endpoint.**
- The mutators are **create**, **update**, and **delete** an annotation.
- Every mutator derives its owner from **`zeroContextFrom(session)`**, never
  from arguments.
- A mutation naming **another user's article or annotation must fail
  server-side and leave no row**, even though the client's optimistic copy
  applied it. Verified **non-vacuously**, with that user's rows genuinely
  present.
- Annotations are read **by sync, not by fetch**: a `defineQuery` entry scoped
  by `ctx.id`, returning `.limit(0)` with no session, exactly like the queries
  already there.
- **Optimistic and live**: a mark applies locally at once and reaches every
  other open client by sync. Verified in a second **window** — Zero drops sync
  for a hidden document, so a second tab proves nothing.
- A rejected mutation **surfaces to the user** through the existing toast rather
  than vanishing.
- Deleting an article removes its annotations **by cascade**, not by a second
  write.

## The tools

- **The 12 decided types are exposed**: highlight, underline, strikeout,
  squiggly, ink, square, circle, line, polyline, polygon, free text, sticky
  note. **Stamp is out of scope.**
- **Tool-select-then-apply**: the user picks a tool, then selects text or
  clicks/drags on the page.
- **The tool stays active** for repeated use until the user switches tools or
  deselects — not a fresh toolbar pick per mark.
- The tools live in the **space task 3 reserved** in the persistent toolbar.
- The **active tool's state is exposed programmatically and conveyed by more
  than color**, and every icon-only tool control has a discernible accessible
  name.

## Persistence behavior

- Marks **save as they are created, edited, and deleted**, with no save step.
- **Only committed changes are persisted.** An in-progress change — a stroke
  mid-drag, a shape being resized — does not write. This is a correctness
  requirement about write volume, not an optimization: without it one ink stroke
  produces a row per animation frame.
- **Existing annotations are on the paper when it opens** — imported once for
  the loaded document, not appearing a moment after the user starts reading.
- The **translation both ways is lossless** for all 12 types: an object becomes
  a row becomes an object with nothing dropped that EmbedPDF needs to redraw it.
- `payload` round-trips through Postgres `jsonb` without reordering or
  type-coercing anything the engine depends on.

## Explicitly not in this task

- **The annotations sidebar tab.** Task 5.
- **Undo/redo** and the history plugin.
- **Stamp annotations.**
- **Export to a marked-up PDF.** The PDF binary is never rewritten.
- **Any cross-user visibility.**

## Cross-cutting

- WCAG 2.2 AA: contrast in both themes, visible focus on every tool control,
  accessible names throughout, active state by more than color.
- Correct in both themes and at narrow, mid, and wide widths — a toolbar that
  grew from three controls to fifteen is a responsive problem as much as a
  feature.
- CI green: Biome, typecheck (incl. the `zero/schema.gen.ts` drift check), unit
  + integration with ratchet coverage, PR-title lint.
