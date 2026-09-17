# Plan: It Fits the Screen

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`a-menu-stays-on-screen`](./tasks/a-menu-stays-on-screen/description.md) | [#230](https://github.com/nicbk/nicbk-website/issues/230) | The horizontal rule for the three hand-positioned reader surfaces, and the sweep that proves no other surface needs one |
| 2 | [`the-row-reserves-what-it-draws`](./tasks/the-row-reserves-what-it-draws/description.md) | [#231](https://github.com/nicbk/nicbk-website/issues/231) | The square controls contribute the width they draw, so the collection stops overrunning and scrolling sideways |
| 3 | [`the-citations-row-breathes`](./tasks/the-citations-row-breathes/description.md) | [#232](https://github.com/nicbk/nicbk-website/issues/232) | Equal room above and below the citations row's controls where the sidebar is not beside it |

## Why this order

- **The unusable one first.** A menu half off the screen cannot be pressed at
  all; the other two are a page that slides 11px and a button sitting 2px from a
  line. It is also the only one of the three that needs a rule rather than a
  correction, so it carries the tests.
- **Then the overrun**, whose cause is known to the pixel and whose fix is one
  declaration if the measurement holds — but which has to be re-measured on both
  engines, because Safari's rounding is what made it visible.
- **The spacing last**, because it is the one a reader lives with most easily
  and the one most likely to want a second look after the first two change what
  a narrow screen feels like.

## Risks

- **The edge rule could fight the vertical one.** Both re-measure on scroll; a
  horizontal answer that changes the menu's width would re-trigger the vertical
  measurement and could oscillate. The rule must be computed from the anchor and
  the viewport only — the same discipline `menuPlacement` already applies.
- **`zoom`-emulated viewports lie** about anything using `vw`, which is exactly
  what the guards use (`research.md`). The sweep has to happen at a real narrow
  viewport, which means Safari on this machine.
- **The square button was itself a fix.** It is square by `aspect-ratio` because
  an earlier report found it ragged beside the search field, and `height: 100%`
  is there because Safari would not feed a stretched height through
  `aspect-ratio`. Whatever replaces the intrinsic width must keep both of those
  results.

## Dependencies

#8 (the collection and its toolbar), #9 (the reader and its menus), #10 (the
citations view), #16 (surface layering, which is why these menus are moved
rather than raised), #19 (the phone widths this is judged at).
