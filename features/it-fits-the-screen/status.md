# Status: It Fits the Screen

**Feature state:** **Not started** (2026-09-17): 3 tasks.

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
| [`a-menu-stays-on-screen`](./tasks/a-menu-stays-on-screen/status.md) | Not started ([#230](https://github.com/nicbk/nicbk-website/issues/230)) | — | — | — |
| [`the-row-reserves-what-it-draws`](./tasks/the-row-reserves-what-it-draws/status.md) | Not started ([#231](https://github.com/nicbk/nicbk-website/issues/231)) | — | — | — |
| [`the-citations-row-breathes`](./tasks/the-citations-row-breathes/status.md) | Not started ([#232](https://github.com/nicbk/nicbk-website/issues/232)) | — | — | — |

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
