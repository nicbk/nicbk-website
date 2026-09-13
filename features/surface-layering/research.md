# Research: Surface Layering

Traceability back into `research/*.md`, plus the measurements this feature was
spec'd from. Everything below was measured on **2026-09-13** against `main` at
`947d2c2`, in **both Chrome and Safari**, on the local Compose stack and on
`nicbk.com`.

## Decided research this builds on

- [design-system.md](../../research/ui-ux/design-system.md) — the site's one
  idea of overlays, focus rings, and how a floating surface is separated from
  what is behind it.
- [collection-view.md](../../research/ui-ux/pages/lit-tracker/pages/collection-view.md)
  — the decided control row, why it is pinned, and the infinite scroll that made
  pinning necessary.
- [reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  — what a mark's controls are and when they appear. This feature changes where
  they paint, not what they contain.

## What was measured

### The collection toolbar is engine-dependent

The row is `position: sticky` with a computed `z-index: auto`
(`collection-toolbar.module.css:62`). Its comment argues no `z-index` is
needed — *"positioned elements paint after in-flow content regardless"* — and
records that a `z-index: 1` was tried and reverted because it lifted the row
above portalled popups.

Hit-testing the same page, the same build, scrolled 500px, probing the centre of
the search pill and two other points over the row:

| Engine | Viewport | Result |
|---|---|---|
| Chrome | 1132px | toolbar receives every probe |
| Chrome | 614px | toolbar receives every probe |
| **Safari** | **600px** | **a card receives every probe** |

The user's original report is a Safari screenshot of `nicbk.com` showing a card
drawn over the search pill, border and all.

**Two hypotheses were tested and rejected before this one.** First, that the
cards were merely showing through the row's deliberate transparency — refuted by
the screenshot, which shows the pill covered rather than seen through. Second,
that `container-type: inline-size` on each grid cell
(`collection-page.module.css:120`) forms a stacking context that outranks the
sticky row — refuted by an isolated probe (sticky bar, a plain sibling, a
`container-type` sibling, overlap asserted at the probe point), where the bar
stayed on top in both cases.

**The fix, verified in Safari.** `isolation: isolate` on `.page` plus
`z-index: 1` on `.toolbar`. Isolation confines the row's layer to the page
subtree, so it outranks the cards without competing with body-level portals —
which is exactly what a bare `z-index: 1` could not do. Measured in Safari at
600px, scrolled 500px:

- before: all three probes over the row hit a **card**;
- after: all three hit the **toolbar**;
- with a card menu open and overlapping the row (57–106): **popup on top**;
- with the upload modal open: a point over the row hits **the backdrop**.

The last two are the precise regressions the original comment records.

### The reader traps everything the engine draws

`pdf-reader.module.css:52` sets `position: relative; z-index: 0` on the
viewport, commented *"A stacking context of its own, so nothing the engine draws
can rise above the toolbar."* It was added for a **previous user report**: the
paper painted over the toolbar and the bar vanished behind page one.

That rule is doing exactly what it says, and that is the defect. Measured on
`nicbk.com` in Safari, by injecting a probe element **inside** the viewport,
positioned over the toolbar, carrying `z-index: 2147483647` — the maximum a
stylesheet can express:

```
viewport{pos:relative,z:0} toolbar{pos:absolute,z:auto}
  => TOOLBAR ON TOP (probe TRAPPED by stacking context)
```

Nothing inside that subtree can rise above the bar at any z-index. The
annotation box is drawn by EmbedPDF inside it, so it is trapped with the pages.
**The two user reports are in direct conflict through one line of CSS**, and
resolving it means separating "the paper" from "UI drawn over the paper" rather
than trading one report for the other.

## What is still unmeasured, and where it gets measured

**Where EmbedPDF puts the annotation UI relative to its page wrappers.** The
engine wraps each page in `position: relative; z-index: 1`. If the annotation
box is rendered *inside* a page wrapper, then simply removing the viewport's
stacking context does not free it — it would be trapped one level down instead,
and the remedy has to be a portal rather than a layer. This decides task 2's
approach and is the first thing that task measures, with a live selection on
screen. It is recorded here as unknown rather than guessed, because two guesses
from code comments were already wrong today.

## The verification gap this exposed

Every browser pass in this project has been Chrome-only, per AGENTS.md. The
toolbar defect reached production and survived because of it: Chrome renders
that page correctly at every width tested. Anything resolved by *implicit* rules
— paint order under `z-index: auto`, stacking contexts, sticky positioning,
hit-testing — is where engines diverge, and this codebase deliberately relies on
those defaults in several places.

The user enabled Safari's *Allow JavaScript from Apple Events* on 2026-09-13 so
both engines can be driven. **AGENTS.md's browser-verification section should
say so**, and that edit belongs to this feature — see
[constraints-and-behavior.md](./constraints-and-behavior.md).
