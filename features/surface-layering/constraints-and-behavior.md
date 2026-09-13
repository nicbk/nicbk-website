# Constraints and Behavior: Surface Layering

## Acceptance criteria

- **The collection toolbar paints above the cards** at every width, in Chrome
  and in Safari, scrolled to any position.
- **Menus, dialogs and backdrops still paint above the toolbar.** A card menu
  overlapping the row covers it; an open modal's backdrop dims it along with
  everything else.
- **The annotation box paints above the reader toolbar** where the two overlap.
- **The paper still paints below the reader toolbar.** Page one must not cover
  the bar — the defect the current rule was introduced to fix.
- **Both orders are stated in the code and asserted by a test**, so a later
  change that reverses one fails rather than ships.

## Must not regress

- The toolbar's transparency and its sticky offset, both of which are decided
  and separately reasoned (`collection-toolbar.module.css`).
- The reader's own overlays that already work: the selection menu's positioning
  by EmbedPDF, the page-navigation control, the reader notice.
- Portalled surfaces anywhere on the site. Nothing here may make a popup or a
  backdrop lose to the surface it was opened from.
- The focus-ring room and scroll containment established in #11's tasks — no new
  overflow in either surface.

## Constraints particular to this feature

- **No site-wide z-index scale.** Each fix is confined to the subtree it belongs
  to, by `isolation` or equivalent, so neither can outrank a body-level portal.
  A global registry is a bigger decision and is explicitly out of scope.
- **A layer that matters gets a comment saying what it beats and what beats
  it** — not merely that it exists. The two comments this feature replaces were
  both confident and one was wrong.
- **Remedies that only raise a number are rejected on sight for the reader.** A
  probe at `z-index: 2147483647` inside the viewport still lost to the toolbar
  (see research.md); anything that does not leave the subtree or remove the
  context cannot work.
- **Measurement before remedy in task 2.** Where EmbedPDF renders the annotation
  box is unknown and decides the approach. It is measured with a live selection
  before any code is written.

## Cross-cutting

- **Browser verification runs in Chrome and Safari for both tasks.** This is the
  feature that proved a Chrome-only pass can sign off a defect that is live in
  production, so it also carries the corresponding edit to **AGENTS.md's
  "Verify features against their intent, in the browser"** section: engine-
  sensitive behaviour — paint order, stacking, sticky positioning, hit-testing —
  is checked in both. Written as the general principle rather than as "remember
  Safari for layering", per that document's own rule about fixing recurring
  mistakes at the level of the principle.
- Verification is by **hit-testing with the overlap asserted first**, not by
  eye: `elementFromPoint` over the region where the two surfaces actually
  overlap, having checked that they do. A screenshot cannot distinguish "on top"
  from "not overlapping yet", and a null result must not be able to pass.
- The deployed host is the last check for task 1, because that is where the
  defect was reported and where the user reads.
- WCAG 2.2 AA unaffected: nothing here changes focus order, names, or contrast.
- CI green: Biome, typecheck, unit + integration with ratchet coverage, PR-title
  lint.
