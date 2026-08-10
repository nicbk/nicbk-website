# Status: Collection Filters

**State:** Implemented, awaiting review. Third of four.

- Branch: `collection-view/collection-filters`, from `main` at `ef2d23d`.
- Sub-issue: [#84](https://github.com/nicbk/nicbk-website/issues/84)
  (parent [#81](https://github.com/nicbk/nicbk-website/issues/81)),
  self-assigned.
- PR: opened once every tier is green locally.

## Settled with the user during implementation (2026-08-09)

Five decisions, each raised because the written spec did not settle it or
because the running page contradicted it.

- **On a narrow screen the filters become a drawer, not a list below the
  content.** The task description says "below the main content", and
  `design-system.md` offers exactly two treatments for this rail — below, or a
  toggleable drawer. Below is the wrong one *here*, because task 4 makes this
  collection scroll infinitely and filters underneath a list that never ends are
  filters nobody reaches. Recorded as a revision in
  `research/ui-ux/pages/lit-tracker/pages/collection-view.md`.
- **The account avatar moved from the foot of the sidebar to the header**,
  between the path and the theme toggle. It went to the sidebar in #7 because
  that is where the mockup draws it; what the mockup could not show is a rail
  with thirty tags in it, under which a single avatar reads as the last item of
  the list. Recorded as a revision in
  `research/ui-ux/pages/lit-tracker/components/header.md`. This restores the
  header spec's *original* 2026-07-04 placement.
- **No `#` before a tag name in the rail.** The blog writes every tag `#name`,
  so the shared toggle drew one everywhere — but the tracker's cards write tags
  plainly and its reading statuses are not tags at all, so the rail was
  labelling one list two different ways. The prefix is now opt-in on
  `TagToggle`, and only the blog opts in.
- **Deleting a tag is a mode, not a control per row.** An `×` beside every tag
  put a column of destructive buttons down a list whose job is filtering, and
  doubled the rail's tab stops. A control beside the "tags" heading now reveals
  a red `×` per row and hides them again — the arrangement list interfaces have
  settled on. The confirmation behind each one is unchanged and still required.
- **A selected tag stays listed while the reader searches for another.** It is
  still narrowing the collection, and a filter you cannot see is one you cannot
  turn off. The card menu got the same treatment for applied tags.

## What the browser caught that the tests did not

Every one of these passed typecheck, lint, and the unit tier first.

- **The rail scrolled as one unit**, so hunting through thirty tags carried the
  reading statuses off the top — the identical fault task 2 had already fixed in
  the card menu, reintroduced here by writing this list to look like the version
  of that one that had *already been replaced*. Both are now three regions with
  exactly one scroll container, and there was no way to search the rail's tags at
  all until the same pass added the find field.
- **A `display: none` sidebar stops being a grid item**, so below the breakpoint
  the content auto-placed into the *rail's* `auto` track and left the `1fr` one
  empty: a 500px window drew the whole collection in a 212px column with 287px
  of nothing beside it. Both stylesheets looked right in isolation.
- **The drawer stayed open when the window grew past the breakpoint**, showing
  the rail and the sheet at once. Hiding the trigger in CSS stops a wide window
  *opening* the sheet and does nothing about one already open; it now closes
  itself on the media-query change.
- **Deleting a selected tag left its name in the URL** with no toggle left in
  the rail to switch it off — a filter that could not be cleared. `dropTag`
  removes it as part of the delete.
- **The confirmation opened with focus on the button that deletes**, Base UI's
  default being the first tabbable element. A reflex Enter after a mis-clicked
  `×` would have confirmed the very thing the dialog exists to question; it
  opens on cancel now.
- **The toolbar's "filters" and "+" were different heights** side by side, each
  having sized itself to its own contents. The row aligns them now, since it is
  the only thing that can see both.
- **The group headings failed contrast in light theme** — the muted token is
  already the quietest colour that clears 4.5:1, and an `opacity: 0.75` on top
  of it does not. Caught by the axe scan over a populated rail, which is
  precisely why that scan seeds a realistic number of tags.
- **Every control in the rail was under the 24×24 target-size minimum** (WCAG
  2.2), a row of bare text toggles four pixels apart being too tight to earn the
  spacing exception. Also an axe finding.

## Follow-up, agreed with the user and deliberately not in this PR

**The signed-in e2e tier takes ~10 minutes**, and this task adds 21 tests to it.
Measured: `collection-cards.spec.ts` is five tests whose bodies are "insert a
row, look at the card" and it takes 56s — ~11s each, almost none of it
assertions. Every one of the tier's 88 tests drives a full OAuth round trip
before it starts. The fix is Playwright's `storageState`: sign in once in a
setup project and start every spec already signed in, with `sign-in-flow.spec.ts`
and the guard-redirect test opting out to keep the flow itself covered. Beyond
that, `workers: 1` exists only because every spec shares one stubbed account and
one database. **Agreed to go out as its own chore PR after this one merges**, on
the same reasoning that split #87 out: a testing-infrastructure rewrite and a
user-facing feature should not share a review.
