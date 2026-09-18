# Status: A Menu Stays on Screen

**State:** **Complete** ([#230](https://github.com/nicbk/nicbk-website/issues/230),
PR [#234](https://github.com/nicbk/nicbk-website/pull/234), merged 2026-09-17).

## What shipped

- **`edgeShift`**, beside `menuPlacement` and shaped like it: the anchor, the
  menu's width, the viewport — and how far to slide, in pixels. Zero when the
  menu already fits, so a mark in the middle of a page does not move at all.
- **`useMenuPlacement` returns that shift**, re-measured on the same scroll and
  resize it already listened to, plus the **window's** resize — the observer
  watches the menu, and a narrower screen moves the edge without changing the
  menu by a pixel.
- Applied as the standalone **`translate`** property rather than a `transform`:
  the stylesheets own these menus' transforms (that is how they hang above their
  anchor) and the two compose, `translate` first, without either knowing the
  other's value. No stylesheet changed.

## Two corrections to the spec

- **Two surfaces take the rule, not three.** The note editor is not positioned:
  it renders *inside* the mark's menu, so it is carried by it — and because it
  widens that menu, it is what makes the shift large. The spec counted three
  positioned surfaces; the code has two.
- **A menu merely near the left edge is left alone.** The first draft nudged it
  to the inset; that would move a menu that is perfectly usable, which criterion
  2 forbids. The rule now returns 0 unless something actually crosses.

## Verified

- **Unit**, in pixels at a 375px screen: a menu that fits is untouched; one near
  the left edge is untouched; one crossing the right stops at the inset; the
  answer is the same however many times it is asked; a menu too wide for the
  screen keeps its left edge; nothing moves on a desktop. A zero-width viewport
  — jsdom, and any measurement before layout — moves nothing, rather than
  flinging every menu to the margin.
- **Mutation checks**: dropping the inset from the arithmetic fails three rows;
  moving a menu that already fits fails four.
- **Chrome, local**, on BERT at a 900px window, measured rather than eyeballed:

  | case | anchor | menu | result |
  |---|---|---|---|
  | a selection at the right edge | left 697.8 | 217.1 wide | slid −30.9 → right edge **884 = 900 − 16** |
  | the same selection's mark, note editor open | left 697.8 | 330 wide | slid −143.8 → right edge **884**; would have run 128px off screen |
  | a selection in the left column | left 288.2 | 217.1 wide | `translate: 0px`, unmoved |

  No ancestor of these menus carries a scale, so the pixel arithmetic holds at
  any reading zoom — checked, because a scaled wrapper would have silently
  halved every shift.
- **Safari at a real 375px** (criterion 6), every portalled surface, measured:

  | surface | box | verdict |
  |---|---|---|
  | account settings | 24 → 351 | inside |
  | credits | 45 → 333 | inside |
  | article menu | 40 → 296 | inside |
  | annotation tools | 126 → 302 | inside |
  | zoom menu | 45 → 181 | inside, though it declares no cap |
  | citation preview, on a link at x 300–316 | 183 → **359** | inside, and **359 = 375 − 16** |
  | the filters sheet | 0 → 375 | full width by design, not an overflow |

  The preview stopping at exactly the same inset this rule uses is the
  corroboration that mattered: the two families of floating surface now stop in
  the same place.

## Not verified here

**The reader's own menus at 375px in Safari.** They need a real text selection,
and a synthetic pointer drag does not reach EmbedPDF's own handling. The rule
reads live measurements, so Safari's only difference — sub-pixel rounding — does
not change what it does; but this is the user's phone check, which the feature's
Definition of Done already asks for.

## Log

- 2026-09-17 — Spec'd.
- 2026-09-17 — Implemented, verified in Chrome by measurement, and the sweep of
  every other floating surface done at a real 375px in Safari.
