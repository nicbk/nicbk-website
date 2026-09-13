# Status: Toolbar Above the Collection

**State:** Implemented, awaiting review. Task 1 of 2 — first because its remedy
was already measured and verified, while task 2's is not.

- Branch: `surface-layering/toolbar-above-the-collection`, from `main` at
  `eb8531d` with the feature spec merged.
- Sub-issue: [**#150**](https://github.com/nicbk/nicbk-website/issues/150).
- PR: [**#153**](https://github.com/nicbk/nicbk-website/pull/153).

## Why this task exists

Cards paint over the collection's sticky search row in Safari — over the search
pill itself, not through the gaps between controls. The user reported it with a
screenshot of `nicbk.com`. It has been live in production and was never caught,
because every browser pass this project has run was Chrome-only, and Chrome
renders the same page correctly at every width tested.

## What shipped

- **`isolation: isolate` on `.page`** and **`z-index: 1` on `.toolbar`** — one
  change in two files. The z-index puts the row above the cards; the isolation
  confines that layer to the page so the row is never compared against a
  portalled menu, dialog or backdrop.
- **The comment that argued no order was needed is gone.** It claimed
  *"positioned elements paint after in-flow content regardless"* — an assumption
  about engine defaults, not a fact the code was entitled to. The replacement
  says what the row beats, what beats it, why the isolation is what makes the
  second true, and which engine caught it.
- **AGENTS.md gained the principle**, not the instance: whatever the code leaves
  to a default gets checked in more than one engine, and any "A is above B"
  claim is asserted by hit-testing the overlap rather than read off a picture.

## Open items, settled

### The test asserts the pairing, and fails for the right reason

Split into two tests, deleting either line would leave one green and read as a
partial regression rather than as the whole fix coming undone — so it is **one
test over two stylesheets**, with messages that say what each line is for.

Verified by deleting each line and running it:

- without the z-index → *"The toolbar needs a z-index to paint above the cards —
  Safari does not give it one for free."*
- without the isolation → *"The page needs `isolation: isolate` to confine that
  z-index. Without it the row also outranks every portalled popup and backdrop,
  which is why the z-index was reverted the first time."*

Both restore green when put back. A test that cannot fail proves nothing, and
this one was checked rather than assumed.

### Comments had to be stripped before asserting

The first version of the "still transparent" assertion failed against the row's
own comment, which contains the sentence *"No background of its own"*. This
project writes long comments **inside** the rules they explain, so a naive
source search finds the prose. `declarationsOf` strips comments first — which is
also the more correct thing to assert, since declarations are what is under
test.

## Browser verification — 2026-09-13

### Chrome, local Compose stack — clean

Seeded 40 probe articles so the collection genuinely scrolls at both widths,
deleted by id afterwards. Every claim was checked by **asserting the overlap
first**, then hit-testing the middle of it.

| Check | Width | Overlap | Result |
|---|---|---|---|
| toolbar above the cards | 620px | 1 card under the row | all 3 probes → **toolbar** |
| toolbar above the cards | 1440px | 4 cards under the row | all 3 probes → **toolbar** |
| card menu above the toolbar | 620px | 73–145 | **popup** |
| modal backdrop above the toolbar | 620px | — | **backdrop** |
| no new overflow, search focused | 620px | — | row 0, panel 0 |

The overlap guard earned its keep: the first menu probed opened *upward* and did
not cross the row at all, and the check reported `NO OVERLAP` rather than
passing on a probe that touched nothing.

### Safari — the rule verified, the build not yet

**The remedy was verified in Safari before the code was written**, on
`nicbk.com` at 600px scrolled 500px, by injecting the identical two
declarations: before, all three probes over the row hit a **card**; after, all
three hit the **toolbar**; a card menu overlapping the row still won; the modal
backdrop still covered it.

What is **not** yet verified in Safari is this branch's own build, because
Safari has no session on `localhost:3000` and signing in is not something the
agent may do. Per this task's constraints the last check runs on `nicbk.com` in
Safari anyway — that is where it was reported and where the user reads — so it
happens **after deploy**. Chrome confirms the files compute to the intended
values (`isolation: isolate`, `z-index: 1`); the open question is only whether
Safari applies the same stylesheet the same way, which nothing suggests it would
not.

If the user signs into `localhost:3000` in Safari, the local check can be run
before merge instead.

## Log

- 2026-09-13 — Implemented. Cause and remedy had already been measured in both
  engines while the feature was spec'd, so this was writing down a verified
  answer, replacing a comment that was confidently wrong, and proving the test
  fails when either half is removed.
