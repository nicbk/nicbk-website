# Feature: It Fits the Screen

**#26** in [../index.md](../index.md). Three things the app does on a narrow
screen that it should not: a menu hangs off the edge, the collection scrolls
sideways, and a row of controls sits against a rule with no room to breathe.

All three were reported by the user on 2026-09-17, from using the tracker on a
phone. Their causes were measured before this was written
([research.md](./research.md)) — and two of them are not what they look like.

## What it is

### A menu leaves the screen

The reader's three floating surfaces — a mark's controls, a selection's bar, and
the note editor — are **positioned by hand**, hanging from the left edge of the
thing they are about. `menu-placement.ts` decides only whether they sit *above*
or *below*, to dodge the reader's toolbar. There is **no horizontal rule at
all**.

Every other floating surface in the app is portalled through Base UI, which
avoids collisions, and caps itself with
`max-width: calc(100vw - 2 × inset)`. The three reader surfaces have caps too —
`21rem` on the selection bar, `min(20rem, 60vw)` on the note editor, none on the
mark's menu — but **a cap is not a position**. They stay narrow and still hang
off the edge.

### The collection scrolls sideways

Not a narrow-width squeeze: the row overruns by **11.1px at every width**,
desktop included. The upload **+** is `height: 100%; aspect-ratio: 1`, so the
width it *draws* comes from the row's height (39.5px in Chrome, 40px in Safari)
while the width it *contributes* to layout is only its glyph, 28.4px. Its
container reserves 112.8px for children that then lay out 123.9px wide.

On a wide screen the overrun hides inside the panel's 12.5px side padding. On a
phone it crosses, and the tracker panel — which declares `overflow-y: auto`,
making the other axis compute to `auto` — turns it into a sideways scroll that
rubber-bands, because `overscroll-behavior` is set on `y` only.

### The citations row has no room

On a phone the row gains a **bordered** button, the sidebar sheet's trigger,
beside the borderless "⋯". The row is 27.5px tall because it is sized to the
tabs' line height — chosen so its rule meets the sidebar's exactly — so that
button sits **2.2px above the rule with 16px above it**.

## What it delivers

- **A hand-positioned menu slides back inside the screen** (user-decided
  2026-09-17): as close to its mark as it can be while fully visible, with the
  same inset Base UI uses — so every floating surface in the app behaves alike.
- **The row reserves the width it draws**, so nothing overruns at any width and
  the collection has nothing to scroll sideways. The **+** stays square: the
  cause is fixed, not the symptom (user-decided 2026-09-17).
- **The citations row breathes where the sidebar is not beside it**: equal room
  above and below its controls at narrow widths, with the desktop rule still
  meeting the sidebar's to the pixel.

## What it does not do

- **No redesign of the reader's menus.** Where they sit vertically, what they
  hold and how they dodge the toolbar are unchanged; only the horizontal rule is
  new.
- **No new width tiers.** The narrow cases use the tiers the stylesheets already
  declare.
- **No clip as a safety net.** Refusing horizontal scroll on the panel was
  considered and left out (user-decided 2026-09-17): with the overrun gone there
  is nothing to scroll, and a clip would hide the next one instead of showing it.
- **Not the phone's own checks.** The user browses in Safari; the exit check is
  theirs at a real phone width.

## Exit state

On a phone: no menu crosses the edge of the screen, the collection does not move
sideways, and the citations row's controls sit with the same room above them as
below.
