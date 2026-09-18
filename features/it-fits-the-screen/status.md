# Status: It Fits the Screen

**Feature state:** **Implemented** (2026-09-17): all 3 tasks merged. Complete
when the user has seen the three behaviours on a phone, which is what this
feature's Definition of Done asks for.

Spec written against `main` at `378f656`, from measurements taken in Chrome at
viewports 320–1400 on the local stack. See [research.md](./research.md) — two of
the three causes are not what the symptoms suggested.

Depends on [`collection-view`](../collection-view/status.md) (#8),
[`article-detail-and-reader`](../article-detail-and-reader/status.md) (#9),
[`citation-graph-traversal`](../citation-graph-traversal/status.md) (#10),
[`surface-layering`](../surface-layering/status.md) (#16) and
[`the-site-fits-a-phone`](../the-site-fits-a-phone/status.md) (#19), all
Complete.

Feature parent issue: [**#229**](https://github.com/nicbk/nicbk-website/issues/229), with one sub-issue per task. The roadmap entry is
**#26** in [../index.md](../index.md). Its parent issue is **checked** on
completion and **closed by hand**.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`a-menu-stays-on-screen`](./tasks/a-menu-stays-on-screen/status.md) | **Complete** ([#230](https://github.com/nicbk/nicbk-website/issues/230)) | [#234](https://github.com/nicbk/nicbk-website/pull/234) | green | merged |
| [`the-row-reserves-what-it-draws`](./tasks/the-row-reserves-what-it-draws/status.md) | **Complete** ([#231](https://github.com/nicbk/nicbk-website/issues/231)) | [#235](https://github.com/nicbk/nicbk-website/pull/235) | green | merged |
| [`the-citations-row-breathes`](./tasks/the-citations-row-breathes/status.md) | **Complete** ([#232](https://github.com/nicbk/nicbk-website/issues/232)) | [#236](https://github.com/nicbk/nicbk-website/pull/236) | green | merged |

## Definition of Done (feature)

All acceptance criteria met, all three tasks merged behind CI + review, and the
three reported behaviours checked by the user on a phone.

## Notes carried into implementation

- **A cap is not a position.** The three reader surfaces already limit their
  width; what they lack is anywhere to be. Every other surface has both.
- **Slide, never flip** (user-decided 2026-09-17).
- **Fix the contribution, keep the square** (user-decided 2026-09-17): the
  upload **+** overruns because of what it reports to layout, not because of how
  it looks.
- **No clip as a safety net** (user-decided 2026-09-17).
- **Measure at a real narrow viewport**, never a `zoom`-emulated one.

## Log

- 2026-09-17 — **All three tasks merged** (#234, #235, #236). What is left is
  the phone check: a mark near the right edge of a page, the collection not
  moving sideways, and the citations row's controls with air above and below.
  #229 is checked and closed by hand when that passes.
- 2026-09-17 — **Task 3 implemented.** Below 768px the row takes the gap it used
  to sit under, growing from the **tabs'** padding. The first attempt used a
  `min-height` on the row and regressed the tab text's alignment — the controls
  centred, the words stayed by the header — which the user caught. Measured
  after: the rule is back at 99.5, exactly the desktop position, the controls
  have 8px above and below, and the text shares their centre line to within half
  a pixel, in both engines.
- 2026-09-17 — **Task 2 merged** (#235).
- 2026-09-17 — **Task 2 implemented.** The 11.1px overrun is exactly the upload
  **+**'s drawn-minus-contributed width (39.5 − 28.4), proved by closing it with
  a floor: `min-width: 2.5rem` takes the row's overrun to 0 at 320, 375, 500,
  900 and 1400, in Chrome and in Safari. `width: max-content` on the container
  was tried and does nothing — a container cannot see a width that does not
  exist until the height does. The button and its row are 0.5px taller in
  Chrome as a result, which is what Safari already drew.
- 2026-09-17 — **Task 1 merged** (#234).
- 2026-09-17 — **Task 1 implemented.** The edge rule, and the sweep it was
  meant to justify: at a real 375px in Safari every portalled surface stays
  inside, and the citation preview stops at 359 — exactly the inset this rule
  uses, so the two families of floating surface now agree. Two corrections to
  the spec: the note editor is carried by the mark's menu rather than positioned
  itself (two surfaces, not three), and a menu merely *near* the left edge is
  left where it is.
- 2026-09-17 — **Spec'd.** Three defects reported by the user from using the
  tracker on a phone. Measured before writing: the reader's menus have no
  horizontal rule at all, while every portalled surface is already guarded; the
  collection's toolbar overruns by 11.1px at *every* width because a square
  button contributes its glyph's width and draws its row's height; and the
  citations row's geometry is identical at 500 and 1400, with a bordered button
  appearing on a phone being what makes 2px of clearance visible. Four decisions
  taken with the user: sweep every surface, one feature with three tasks, fix
  the cause rather than clip the axis, and slide a menu inside rather than flip
  it.
