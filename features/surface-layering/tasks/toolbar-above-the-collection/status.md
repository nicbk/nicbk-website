# Status: Toolbar Above the Collection

**State:** Not started. Task 1 of 2 — first because its remedy is already
measured and verified, while task 2's is not.

- Branch: `surface-layering/toolbar-above-the-collection`, from `main` with #11
  merged.
- Sub-issue: [**#150**](https://github.com/nicbk/nicbk-website/issues/150).
- PR: opened once the unit tier and the two-engine browser pass are clean.

## Why this task exists

Cards paint over the collection's sticky search row in Safari — over the search
pill itself, not through the gaps between controls. The user reported it with a
screenshot of `nicbk.com`. It has been live in production and was never caught,
because every browser pass this project has run was Chrome-only, and Chrome
renders the same page correctly at every width tested.

## The remedy, already verified

`isolation: isolate` on `.page` plus `z-index: 1` on `.toolbar`.

Measured in Safari at 600px, scrolled 500px, against `nicbk.com`:

- **before** — all three probes over the row hit a **card**;
- **after** — all three hit the **toolbar**;
- **card menu overlapping the row (57–106)** — the popup wins;
- **upload modal open** — a point over the row hits the **backdrop**.

The last two are the precise regressions the code's current comment records
from the time a bare `z-index: 1` was tried and reverted. Isolation is what
makes the z-index safe: it confines the row's layer to the page subtree, so the
row outranks the cards without competing with body-level portals.

## Open items to settle while writing

- **How the test names what it is protecting.** The assertion has to fail for
  the right reason when someone deletes `isolation: isolate` believing it
  redundant. A test that merely greps two declarations passes a stylesheet where
  they have drifted onto unrelated selectors; the message matters as much as the
  check.
- **The wording of the AGENTS.md edit.** It must be the general principle —
  behaviour left to engine defaults is verified in more than one engine — rather
  than a rule naming Safari and layering, which would miss the next variation.

## Log

- 2026-09-13 — Filed with the feature, cause and remedy already measured in both
  engines.
