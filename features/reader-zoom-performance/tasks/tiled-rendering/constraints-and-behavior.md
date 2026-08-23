# Constraints and Behavior: Tiled Rendering

Which of [#14's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies: **all of them.** The feature is one task, so this file is about the
specific claims a reviewer can check rather than a restatement.

## What must be true when this merges

- **Memory stops tracking the square of the zoom.** Measured as the baseline
  was — the count of page image elements and their natural dimensions — at fit
  width, 200% and 400%, in a window of the same size. The 400% figure must be a
  small multiple of the fit-width one rather than the ~24× it is today.
- **A zoom step at 400% is fast.** Recorded as a number, from the click to the
  paper being sharp again. What replaces 3825 ms must be quick enough that the
  control reads as having acted.
- **Panning at 400% is smooth**, with no stall of the interface, no region that
  stays blank once it has settled, and no visible seam between tiles.
- **The paper at rest is no blurrier than `main`'s** at the same zoom, compared
  side by side rather than from memory.
- **A click on the bare paper still deselects a mark, and still creates nothing**
  — the behaviour #114 and #118 shipped. It rests on `blank-paper.ts`'s
  attribute, and this task adds a second image layer over the one that carries
  it.
- **Text selection, marks, both menus, the touch handles and the magnifier all
  work at high zoom.** The magnifier draws from the page image; if the lens is
  visibly softer than before, that is raised (and, per the plan's risk section,
  answered by sourcing the tile under the finger).
- **The tiling plugin is registered after its dependencies**, with this reader's
  chosen configuration stated explicitly rather than left to defaults it happens
  to agree with — the same rule the other eight registrations follow.

## What must not regress

- The toolbar's zoom controls, presets and percentage; the page field and the
  jump from the sidebar; the pinch gesture (#109).
- The reader's notice states — engine loading, engine error, document error.
- Both themes, narrow / mid / wide.
- CI green: Biome, typecheck, unit + integration, ratchet coverage, PR-title
  lint.

## Explicitly out of scope

- **Capping the zoom range.** If 10× still misbehaves after this, it is a
  finding with a number attached, not a limit imposed here.
- **Pre-rendering beyond the viewport** (`extraRings` above 0) unless the
  browser pass shows scrolling needs it — it trades the memory this task exists
  to recover.
- **The pinch defect** (#12, task 7). Same gesture, different subsystem.
