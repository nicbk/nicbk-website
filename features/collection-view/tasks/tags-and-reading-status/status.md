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
- **Deleting a tag outright moved to task 3's filter rail**, behind a required
  confirmation. Raised mid-implementation, because the criteria here ask for
  tag deletion and no decided doc says where it happens: `collection-view.md`
  says tags are "freely created/deleted" and stops, and `article-edit.md` is
  about deleting the *article*. The rail is the only surface that lists every
  tag, and deleting from a list is where deletion belongs; putting it in the card
  menu would leave "remove from this article" and "delete everywhere" one row
  apart. The user added the confirmation requirement — a small control in a list
  of toggles is easy to mis-hit — and task 3's docs now carry both. **The
  `tags.delete` mutator is still built, authorized, and integration-tested
  here**; only its trigger moved.

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

## What was found in the browser

Four things the automated tiers could not have caught, all fixed:

- **A menu label rendered one character per line.** Base UI unmounts a
  `RadioItemIndicator` that is not ticked, so an unticked row has a single child
  — which CSS grid auto-places into the *first* column, the 1rem one meant for
  the tick. "reading" then wrapped inside a 16px box. Naming both tracks
  explicitly (`grid-column: 1` / `2`) is the fix, and it is what Base UI's own
  example does. Invisible in jsdom, which has no layout.
- **The failure toast quoted the sync engine at the reader.** With the app server
  stopped, it read *"that did not save — Fetch from API server threw error: fetch
  failed"*. Zero tags an error `app` (a mutator threw) or `zero` (transport), and
  ignoring that distinction was the bug.
- **And the title was worse than the message.** Restarting the server showed why:
  Zero had **queued** the mutation and applied it on reconnect, so the write it
  said had failed was sitting in a retry queue. It now reads "not saved yet …
  queued and will be sent when the connection returns", which is true either way.
- **`autoFocus` on the dialog's field was redundant** and tripped Biome's
  `noAutofocus`. Base UI's `Dialog` already focuses the popup's first tabbable
  element — and deliberately does not on touch, where it would throw a keyboard
  over a dialog the reader has not read yet.

Also confirmed against the live stack rather than assumed: a tag inserted
directly into Postgres appeared in an open card menu with no reload, and every
write made from the UI was read back out of Postgres afterwards.

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
