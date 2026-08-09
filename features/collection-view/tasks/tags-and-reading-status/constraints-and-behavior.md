# Constraints and Behavior: Tags and Reading Status

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "Schema" — all of it:**

- `tags` and `article_tags` are declared in Drizzle and migrated exactly as
  specified, with `unique (article_id, tag_id)`.
- UUIDv7 primary keys generated **on the client** — these are the first rows a
  client creates — `timestamptz` timestamps, hard deletes, and
  `ON DELETE CASCADE` on all three foreign keys.
- **Reading status stays `articles.status`.** No table, no seeded rows, no
  `kind` column, no trigger.
- Both tables are added to the **`zero_data` publication** and to
  `drizzle-zero.config.ts` **in the migration that creates them**, and
  `src/zero/schema.gen.ts` is regenerated.
- Tags are **per-user**; there is no shared tag.

**From "Writes and authorization" — all of it:**

- All five mutators — create tag, delete tag, attach, detach, set reading status
  — are registered in `src/zero/mutators.ts` and executed by the existing
  `/mutate` endpoint. **No new REST endpoint.**
- Every mutator takes its owner from `zeroContextFrom(session)`, never from
  arguments.
- A mutation naming another user's article or tag **fails server-side and leaves
  no row**, proven with that user's rows genuinely present.
- Deleting a tag removes its `article_tags` rows **by cascade**, not by a second
  write.
- The new tables are **read by sync**, through their own `ctx.id`-scoped
  `defineQuery` entries in `src/zero/queries.ts`.
- Changes are **optimistic locally and live across clients**.
- A mutation the server rejects **surfaces to the user** rather than vanishing.

**From "Tag and reading-status interaction" — all of it:**

- Tags are user-defined, freely created, and applied to any number of articles.
  **Deleting one is task 3's**, from the filter rail and behind a confirmation
  (user-decided 2026-08-09 — see status.md). The `tags.delete` mutator it calls
  is built and proven here; only its trigger moved.
- The three reading statuses render as tags in the same treatment, cannot be
  renamed or deleted, and are **mutually exclusive** — choosing one clears the
  previous.
- Applying a tag that does not exist **creates it**; there is no separate
  management surface.
- The card menu is keyboard-operable, focus-trapped while open, Escape-
  dismissible, and restores focus to its trigger.

**From "The article card":**

- The card carries its **three-dot menu in the top-right corner**, and **tags
  render on the card** with the reading-status tag among them. This completes
  the card's decided content, which task 1 delivered all of except these two.

**From "Cross-cutting quality":**

- The menu trigger is icon-only and carries a discernible accessible name that
  identifies **which** article it belongs to — "options" repeated across twenty
  cards is not a name.
- Tag chips and status meet AA contrast in both themes; status is distinguishable
  by more than color alone.
- CI passes, including the `schema.gen.ts` drift check this task's migration
  would otherwise trip.

## Explicitly not satisfied here

- Everything under **"Filtering and search"** — tasks 3 and 4. Tags exist and are
  editable here; they do not yet narrow anything.
- The **toolbar layout** criteria — task 4.
- **Metadata editing, reference editing, deletion** — #11, which extends this
  task's menu.

## Exit state

A signed-in user opens a card's three-dot menu, types a new tag and applies it,
and marks the paper `reading`. Both appear on the card at once, and both appear
in a **second browser window** with no refresh. Marking it `read` clears
`reading`. Applying the same tag to a second card reuses it rather than making a
second tag of the same name. Underneath, an integration test proves that the same
mutations — including the delete whose trigger is task 3's — run under another
user's context against these rows, write nothing at all.
