# Status: Annotation Box Above the Toolbar

**State:** Implemented, awaiting review. Task 2 of 2.

- Branch: `surface-layering/annotation-box-above-the-toolbar`, from `main` at
  `0e927c7` with task 1 merged.
- Sub-issue: [**#151**](https://github.com/nicbk/nicbk-website/issues/151).
- PR: [**#154**](https://github.com/nicbk/nicbk-website/pull/154).
- **On merge this completes #16** — check the parent issue
  [#149](https://github.com/nicbk/nicbk-website/issues/149) and close it by hand
  if it has not closed itself (#140's did not).

## Why this task exists

A mark's controls were drawn underneath the reader toolbar, so a reader marking
a passage near the top of the page could not see or reach what they had just
marked.

## The measurement this task was gated on

Taken with a live mark selected, which is what the spec required before any code
was written. The menu's ancestry, outward:

```
.menu                        transform → stacking context
  div  pos:absolute  z:3     EmbedPDF's positioning wrapper
  ._pageLayers_ / ._page_    ours, z:auto
  div  pos:relative  z:1     EmbedPDF's page wrapper → stacking context
  ._viewport_  pos:relative  z:0   → stacking context
  ._reader_                  ← the toolbar is a child of THIS
```

**The decisive line is the last one.** The toolbar is the viewport's *sibling*,
not its descendant. For the menu to outrank the bar, the viewport's whole
subtree must — and that is the paper painting over the toolbar, the defect this
reader already fixed once on a user's report. Confirmed separately: the layers
inside the viewport sit at `z-index` 1, 2 and 3 and nothing in there forms a
context of its own, so removing the viewport's context puts the pages straight
back over the bar.

So **no layer value frees the menu**, and the spec's other branch — a portal —
would mean re-deriving page-relative coordinates and the engine's
counter-rotation through scroll, zoom and rotation. That is the trade the task's
constraints said to raise rather than take, and it was raised.

**Decided: move the menu instead of raising it** (user-decided 2026-09-13). Near
the top of the document it hangs *below* its anchor rather than above.

## What shipped

- **`menu-placement.ts`** — a pure decision (`menuPlacement`) and a thin hook
  (`useMenuPlacement`) that only supplies rectangles.
- **Both menus use it.** The mark's controls and the text-selection bar are the
  same mechanism by design; the placement rule lives once rather than twice.
- **`data-placement` on each menu**, with the stylesheets expressing the two
  positions.
- **`READER_TOOLBAR_ATTRIBUTE`** on the toolbar, so a menu can find the one
  thing it has to dodge.

## What the browser found, and what changed because of it

Three defects, none of which any unit test could have caught, and one of which
my own first browser check reported as a pass.

### The measurement never ran

The first version keyed the effect on a `RefObject`. EmbedPDF mounts one of
these components **per annotation on the page**, and they draw nothing until
their own mark is picked up — so the effect ran once against an element that did
not exist, and a `RefObject` never changes identity, so it never ran again. The
menu kept whatever the stylesheet gave it.

**It looked fixed at first**, because HMR had re-rendered a menu that was already
on screen. A full reload showed the placement still `above` and still overlapping
the bar. This is the AGENTS.md "order you did not choose" case exactly: the
effect ran before the element existed. A callback ref makes the node's *arrival*
schedule the measurement.

The regression test for it was checked by reproducing the bug — keying the effect
on `[]` — and confirming it fails, then passes again when restored.

### "Below" landed on top of the mark

`translateY` resolves percentages against the *transformed box*, so `-100%`
correctly clears the anchor upward but the mirrored version moved the menu down
by **its own height** from the anchor's top — which for any mark taller than the
menu covers the mark it is about. Found with a 35px mark. `top: 100%` against
the wrapper, which EmbedPDF sizes to the mark, is what "below" actually means.

### The toolbar is not the size it looks

`.toolbar` is `left: 0; right: 0` — the full reader width — and deliberately
transparent, with only its groups opaque and clustered in the middle. Measured
by its own box it appears to span the document, and a mark in the top-left
corner would have been moved out of the way of paper. The hook now measures the
**union of the toolbar's groups**: 565–1051 at 1440px, against a box of
200–1416.

## Browser verification — 2026-09-13, Chrome, local Compose stack

Every claim by hit-test or rect comparison, with the overlap asserted first.

| Check | Result |
|---|---|
| mark near the top, fresh load | `below`, menu 189–225 vs mark 150–185 — **below the mark** |
| …clears the visible bar (89–125) | **yes**, and the menu is reachable at its own centre |
| **regression: paper below the toolbar** | 2 pages under the bar, probe over it hits the **toolbar** |
| narrow, 700px | mark slides under the bar (118–137); menu re-measures and flips, 141–178 |
| dark theme | menu below the mark, clear of the bar, legible over the paper |

The narrow case also exercises the re-measurement path: the anchor moved under a
stationary bar and the placement followed.

## Open item: Safari

**Not verified in Safari.** It has no session on `localhost:3000` and signing in
is not something the agent may do — the same gap task 1 carried. The placement
logic is geometry, not paint order, so it is far less engine-sensitive than the
defect that started this feature; but that is an argument, not a measurement,
and this feature exists because an argument like it was wrong.

Either sign into `localhost:3000` in Safari and the check runs before merge, or
it runs on `nicbk.com` after deploy.

## Log

- 2026-09-13 — Measured, decided with the user, implemented. The measurement
  ruled out the layer remedy outright; the browser then found three defects the
  unit tier could not, including one that the first browser check itself
  reported as a pass because HMR was masking it.
