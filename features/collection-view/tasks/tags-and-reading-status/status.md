# Status: Tags and Reading Status

**State:** Not started. Second of four.

- Branch: `collection-view/tags-and-reading-status` (not yet created).
- Sub-issue: not yet filed.
- PR: none.

## Notes carried into implementation

- **`/mutate` is the authorization boundary for every client write on this
  site.** Zero has no permissions layer behind it, and the client's optimistic
  copy applies a write before the server sees it. Derive the owner from
  `zeroContextFrom(session)`, never from arguments, and prove it non-vacuously
  with another user's rows present — the same standard #7's task 1 held `/query`
  to.
- **`mutate-endpoint.ts` already names what to write.** Its comment spells out
  `mustGetMutator(mutators, name).fn({args, tx, ctx})` with `ctx` from
  `zeroContextFrom(session)`. Follow it rather than re-deriving the wiring.
- **Follow the schema doc literally.** `tags-and-reading-status.md` specifies
  both tables column by column and explicitly rejects the tags-table model of
  reading status. Deviating means re-deciding with the user, not improvising —
  and the rejected design's seeding hook would have had to dodge a documented
  Better Auth social-login bug, which is part of why it was rejected.
- **Three steps, one migration**: create the tables, extend the `zero_data`
  publication, update `drizzle-zero.config.ts` — then regenerate
  `src/zero/schema.gen.ts`. CI's drift check catches only the regeneration.
  Changing the publication later forces a full replica resync.
- **Client-generated UUIDv7 primary keys.** These are the first rows created
  from the browser, so this is the first task where that convention has a real
  consumer.
- **Base UI has the primitives**: `menu` for the card menu, `toggle-group` for
  the mutually-exclusive status group, `combobox` for tag entry with
  create-if-missing. Build on them rather than hand-rolling — the same rule the
  blog's `Toggle`-based tag filter follows.
- **A rejected mutation needs somewhere to go.** The decided pattern for an
  error outside a form context is a dismissible toast, and the site has none;
  `ArticleCollection`'s comment already flags this. The proposal — build a shared
  toast on Base UI's `Toast` — is recorded in
  [the feature's research.md](../../research.md) as an **open item to settle with
  the user at the start of this task**, because it makes a site-wide component
  out of a lit-tracker need.
- **Verify with a second window, not a second tab.** Zero drops sync for a
  hidden document.
- Re-verify Zero 1.8's mutator API against the installed package before writing
  code (research-over-recall). Checked at spec time on 2026-08-09 — see
  [the feature's research.md](../../research.md) — but that check ages.
