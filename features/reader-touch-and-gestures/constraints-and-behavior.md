# Constraints and Behavior: Reader Touch and Gestures

Acceptance criteria for #12. Each task's own file names the subset it satisfies.

## Zooming by gesture

- **A trackpad pinch zooms the paper, not the page.** The browser's own page
  zoom must not fire: after pinching over the document, the chrome, the sidebar
  and the toolbar are the size they were.
- **A two-finger pinch on a touchscreen zooms the paper**, over the document and
  while any tool is active or none is.
- **The toolbar keeps telling the truth.** A gesture-driven zoom moves the same
  state the `+`/`−` controls and the percentage read from — there is one zoom
  level, not a gesture one and a control one.
- Zoom by gesture is centred on the gesture, not on the viewport's corner: the
  point under the fingers stays under the fingers, as far as the engine's own
  zoom-to-point allows.

## Scrolling and selecting by touch

- **One finger dragging the paper scrolls it**, when no annotation tool is
  active. This restores the property `design-system.md` already claims the site
  has (2026-08-09: "wheel, trackpad, keyboard, and touch all work").
- **A long press followed by a drag selects text**, and the selection behaves
  from there exactly as a pointer-made one does — the copy control appears over
  it, ⌘C copies it, Escape drops it.
- **A live drawing tool takes one-finger drags back.** With a tool chosen from
  the menu, a touch drag draws the mark, as it does today; putting the tool down
  ("select" in the menu, or Escape) returns the drag to scrolling.
- **Two fingers always pinch**, whichever of the above is true.
- Scrolling by touch obeys the decided overscroll rule: it stops at the end of
  the reader's own scroll container rather than chaining into the page behind it
  (`design-system.md`, 2026-08-09).

## Putting a mark down

- **Clicking away from a selected mark deselects it and creates nothing**, even
  with a tool still active. The click that deselects is spent on deselecting.
- **A second click, with nothing selected, creates as it does today.** The
  sticky tool is a decided behaviour and stays: this changes what the *first*
  click after a selection does, not what the tool does.
- Deleting, editing a note, and the mark's floating menu are unaffected —
  clicking a control inside that menu is not "clicking away".

## Cross-cutting

- **WCAG 2.2 AA.** Every gesture added here is a convenience over an existing
  control, never the only way to reach a state: zoom stays reachable from the
  toolbar, scrolling from the keyboard, selection from a pointer. Nothing here
  may become a path that only a multi-touch device can walk.
- Correct in both themes and at narrow, mid and wide widths — though this
  feature changes input rather than layout, so the risk is regression, not
  novelty.
- **No new stored data and no schema change.** If implementation finds otherwise,
  that is a finding to raise, not a migration to slip in.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
- **Browser verification is primary evidence, and must include a real touch
  device or emulation.** Both Playwright tiers remain suspended; a gesture
  feature verified only with a mouse has not been verified at all.
