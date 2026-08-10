# Status: Collection Search

**State:** Implemented, awaiting review. Fourth of four — the last task of the
feature.

- Branch: `collection-view/collection-search`, from `main` at `72a145c`.
- Sub-issue: [#85](https://github.com/nicbk/nicbk-website/issues/85)
  (parent [#81](https://github.com/nicbk/nicbk-website/issues/81)),
  self-assigned.
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close [#81](https://github.com/nicbk/nicbk-website/issues/81) by
  hand.** It is the feature's parent issue and GitHub does not close a parent
  when its sub-issues close.

## Settled with the user before writing

Five things the task's own documents did not decide, agreed up front.

- **The live query is not part of `useCollectionFilters`.** That hook is called
  twice at once — the rail and the drawer — and local state in a hook called
  twice is two states, so the toolbar's field would have updated its own copy
  while the grid read the debounced URL. `useCollectionSearch` is a separate hook
  called **once**, by `CollectionPage`, which owns the text and hands it to the
  input. Both hooks write the same search object, so each carries the other's
  keys through untouched rather than rebuilding it.
- **`useIncrementalReveal` moved to `src/routes/-shared/hooks/`.** It was in the
  blog's `-utils/`; importing it across the route tree would have tied the
  tracker to the blog, and copying it is the duplication the guidelines rule out.
  First entry in a `hooks` folder beside `-shared/components/`.
- **The search input is capped at 32rem.** `.searchSlot { flex: 1 }` is what
  *pinned* the controls to the column's far edge, so filling the slot with a
  growing field would have kept them there. Capped, the field stops growing and
  the controls stop with it.
- **Substring matching, so `read` also keeps `reading` articles.** One status is
  a prefix of the other. Consistent with the blog's search and the rail's find
  field, and the alternative — special-casing status to an exact match — makes
  one clause of one predicate behave unlike the rest of it.
- **The announced count gets its own debounce.** `role="status"` is polite, but
  its text was changing on every keystroke; the task's testing doc asks for "not
  per keystroke", and a 500ms settle makes that true rather than likely.

## Settled with the user during implementation

- **The toolbar is sticky, and transparent.** Infinite scroll is what made this
  necessary: with the row scrolling away, a reader twenty cards down had to
  return to the top to search or to upload — the same fault that sent the filters
  into a drawer in task 3 rather than under a list that never ends. Raised after
  finding it in the browser; the user asked for it to stay **transparent** so the
  collection is visibly passing behind the controls rather than disappearing
  under a band, and each control's own fill is what keeps it legible.
- **The row's contents are centred in the column.** The cluster — search bar,
  "filters", "+", status — sits in the middle of the panel rather than against
  its left edge, with the slack split evenly.
- **"no articles match these filters." became "no articles match."** Task 3's
  wording named the wrong control the moment a typed query could empty the grid,
  and the shorter form is what the feature's acceptance criteria say.

## What the browser caught that the tests did not

- **The reveal count was an absolute number captured at mount.** A page opened
  with a filter matching one article and then cleared left the reader looking at
  a *single* card, with the rest behind a sentinel they had to scroll to. The
  hook now counts **batches** and derives the visible count, so the floor is
  always a whole batch. Found by wiring it to a filtered collection; the blog,
  whose list never changes length, could not have shown it.
- **`top: 0` does not pin a sticky row to the top of a padded scroll container.**
  A sticky offset is measured from the scroll container's *content* box, so the
  row stuck one inset *below* the visible top of the panel and left a 24px strip
  for cards to scroll through. The row now offsets by that inset and the page
  gives up the panel's top padding to it.
- **Both alignment assertions measured the wrong box.** The `<input>` starts
  ~39px inside the pill (border, padding, magnifier), and the cluster's trailing
  edge is the upload indicator rather than the "+". Both reported a correct
  layout as broken.
- **A bare `fill('')` left the grid still narrowed.** The same swallowed-event
  half of the hydration gap `e2e-testing.md` records for `fill`. Clearing now
  asserts the end state and retries, exactly as typing does.

## Testing, and what is deliberately missing

The unit tier covers the predicate (title, authors, tags, status; composition
with the rail; the missing-field case), both hooks, the reveal hook, the debounce,
the toolbar, and the collection's reveal and announcement. 822 tests green;
line coverage 91.47%, up from main's 90.72%.

`e2e-auth/collection-search.spec.ts` was written and was **green at 17/17**
before the tier was suspended — it is committed and still runs on demand.

**End-to-end tests are no longer a per-PR gate.** Decided with the user during
this task: both e2e jobs are switched off in CI while the Lit Tracker is built
out, because fifteen minutes per PR on surfaces that change shape every task is
the slowest feedback loop in the project applied at its least useful moment. The
reasoning, what replaces the coverage, and how to turn them back on are recorded
in the 2026-08-09 addendum in
[../../../../research/testing-qa/e2e-testing.md](../../../../research/testing-qa/e2e-testing.md),
with the accessibility consequence noted in
[accessibility-testing.md](../../../../research/testing-qa/accessibility-testing.md).
Worth stating plainly on this task's record: **no axe scan and no browser-level
regression check runs on this PR.** The browser pass below is what stands in.

## Browser verification

Against the Compose app at 500px, 820px, 1440px, and 1600px, in both themes,
with the collection seeded to 24 articles (twenty temporary rows, since removed —
the dev database is back to its four real papers): typing narrows the grid on the
keystroke; the query composes with a rail tag and both survive a reload; twelve
cards draw first and the rest reveal on scroll, down to the last one; the toolbar
stays put through all of it with the cards visible behind it; nothing overflows
sideways at any width.
