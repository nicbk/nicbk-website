# Status: Tags and Reading Status

**State:** In progress. Second of four.

- Branch: `collection-view/tags-and-reading-status`, from `main` at `afc316e`.
- Sub-issue: [#83](https://github.com/nicbk/nicbk-website/issues/83)
  (parent [#81](https://github.com/nicbk/nicbk-website/issues/81)),
  self-assigned.
- PR: none yet.

## Settled with the user before implementation (2026-08-09)

- **A rejected mutation surfaces through a shared toast**, built on Base UI's
  `Toast` under `src/routes/-shared/components/` — the open item this task was
  required to open with. That is `design-system.md`'s decided pattern for an
  error outside a form context, and this task's writes are issued from a popup
  menu that has closed by the time the server answers, so there is no inline
  slot to put the message in. The collection's own inline error notice may move
  onto it. The rejected alternative was an inline message beside the card.
- **The card's elided lines move from the native `title` attribute to Base UI's
  `Tooltip`.** Task 1 chose `title` because the card was inert and a Base UI
  trigger is focusable — three extra tab stops per card, on a card with no other
  interaction. This task makes the card interactive anyway, so that objection
  no longer holds.
- **The Playwright typecheck gap went out separately** as chore PR #87, before
  this branch, so this task's diff stays about schema, mutators, and
  authorization.

## Re-verified against the installed packages (2026-08-09)

Redone here rather than trusted from the spec-time note, per
research-over-recall. Two findings change the plan:

- **`zero.mutate(request)` returns `{client, server}` promises**, each resolving
  to `{type: 'success'} | {type: 'error', error: {type: 'app' | 'zero', message}}`
  (`zero-client/src/client/custom.d.ts`). The toast must be fed by awaiting
  **`.server`**: `client` is the optimistic half and resolves first, so awaiting
  it would report success on precisely the write the server then refuses — the
  failure the toast exists for.
- **`ZeroProvider` is not being given a `mutators` prop.** `zero-client.tsx`
  passes `schema`, `cacheURL`, `userID`, and `context` only. `mutators` is a real
  `ZeroOptions` field and is what applies a write locally before the server sees
  it, so this task adds it — subject to Zero's own constraint that **client
  mutators must be idempotent**, since a mutation is rebased repeatedly as
  authoritative changes arrive. "Attach a tag" is required to be idempotent for
  an unrelated reason already, which is convenient rather than sufficient: every
  one of the five needs checking against this.
- Otherwise as recorded: `defineMutator(validator, ({args, ctx, tx}) => …)`
  composed by `defineMutators({…})`, dispatched server-side by
  `mustGetMutator(registry, name).fn({args, tx, ctx})`, and Base UI 1.6.0 ships
  `menu`, `toggle-group`, `combobox`, `tooltip`, and `toast`.

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
- **A rejected mutation needs somewhere to go** — settled above: a shared toast.
- **Verify with a second window, not a second tab.** Zero drops sync for a
  hidden document.
