# Status: Tags and Reading Status

**State:** Merged 2026-08-09. Second of four.

- Branch: `collection-view/tags-and-reading-status`, from `main` at `afc316e`
  (deleted after merge).
- Sub-issue: [#83](https://github.com/nicbk/nicbk-website/issues/83)
  (parent [#81](https://github.com/nicbk/nicbk-website/issues/81)), closed by
  the merge.
- PR: [#88](https://github.com/nicbk/nicbk-website/pull/88), merged with all
  five CI checks green — 52 files, +6047/−242.

## Changed since, by the task after this one

Task 3 revisited two of this task's surfaces rather than leaving them to drift:

- **The card menu's tag list now keeps applied tags visible while filtering**
  (user-decided 2026-08-09). Typing to find one tag used to hide the ones
  already on the article, which made the ticked boxes stop being a reliable
  answer to "what does this paper carry?" and put an un-tick behind clearing the
  field first. The filter rail does the same with selected tags, and both call
  the same `matchingTags` helper, now shared in `src/lit-tracker/tag-matching.ts`
  rather than kept privately here.
- **The three-dot trigger highlights in the accent colour instead of growing a
  border** on hover and while open (user-decided 2026-08-09) — a border inside
  an already-outlined card read as a second frame around the corner.

All four tiers pass locally: 683 unit, 92 integration (including the 27 that
run the five mutators against real Postgres under two users' contexts), 61
production e2e, and 64 signed-in e2e. Plus a manual pass in Chrome, in both
themes at three widths, against the four real papers — see below, since it is
where most of the interesting failures came from.

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

## What the card control became, and why

The three-dot control was a Base UI **`Menu`** first, built from `RadioItem`s
and `CheckboxItem`s. That was the right shape for the plan's brief — the plan
had proposed a `ToggleGroup` and a `Combobox` *inside* a menu, which a `menu`
role cannot host, since its children are `menuitem`s and a textbox among them
breaks the keyboard model that makes a menu a menu.

It stopped being the right shape the moment a reader had a real number of tags.
Three problems, raised by the user, all the same problem underneath — **a menu
is one flat list, so it scrolls as one**:

1. Scrolling to a tag scrolled the reading status out of view.
2. "new tag…" sat past the end of the tag list, so making one meant scrolling to
   the bottom first.
3. There was nowhere to put a filter, which is what a list of thirty tags needs.

It is now a **`Popover`** holding three regions that behave differently: a
`ToggleGroup` for status that never scrolls, a filter field that never scrolls
and doubles as the way a tag is created, and the tag list — the only thing in
the popup that scrolls at all. The separate naming dialog is gone: typing a name
and pressing Enter applies it if it exists and creates it if it does not, which
is the same rule as before with one fewer surface.

## The card's foot, and how loud status should be

Also user-raised: as a chip, reading status read *louder than the title* — an
outlined box with a word in it, under a title that is only text. It is now an
icon at the trailing edge, tags scrolling to its left, with a tooltip naming it
for a reader who can see it and an `aria-label` for one who cannot. The decided
model — status renders "as a tag", filterable beside real tags — survives where
it matters; what changed is its weight on the card.

The tag row gained a fade at its trailing edge in the same pass. It is the
replacement affordance for the scrollbar that is deliberately hidden: without
it, a row with more tags than fit simply looks like a row that ends.

## What was found in the browser

Five things the automated tiers could not have caught, all fixed:

- **A card with more tags than fit deformed the whole grid.** The chip row
  wrapped, and `grid-auto-rows: 1fr` gives every row the height of its tallest
  card — so one paper with ten tags made every card beside it taller, including
  the ones with none. Raised by the user, who also decided the answer: keep every
  card the same size, scroll the chips **horizontally** with no visible
  scrollbar, and let nothing else in the card move. Implemented as
  `flex-wrap: nowrap` + `overflow-x: auto` + hidden scrollbar on the row, and
  `overflow: hidden` on the card so the row is the only thing that can scroll.
  Hiding the scrollbar hides an affordance, so the row takes focus itself —
  otherwise the tags past the right-hand edge are reachable by pointer and by
  screen reader but not by keyboard (WCAG 2.1.1, and axe's
  `scrollable-region-focusable`). Measured in the browser afterwards: four cards
  at 171px each with one of them carrying eleven chips, `scrollWidth` 1031 in a
  304px row, and a scrollbar thickness of zero.

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

And one thing the *specs* got wrong rather than the code — worth recording
because it was silent. A card's tag chips are a nested list, so
`getByRole('list', {name: 'Articles'}).getByRole('listitem')` — the locator three
specs shared — began matching every chip as well as every cell. It does not fail
loudly; it counts the collection wrong. Both scopings a card locator now needs
(past the header's one-item path list, and past its own chips) live in
`e2e-auth/support/collection.ts` rather than in three copies.

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
