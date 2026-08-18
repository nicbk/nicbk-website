# Status: Gestures

**State:** In progress. First of three.

- Branch: `reader-touch-and-gestures/gestures`, from `main` at `c4cd16c`
  (#9's final merge).
- Sub-issue: [**#109**](https://github.com/nicbk/nicbk-website/issues/109),
  under parent [#108](https://github.com/nicbk/nicbk-website/issues/108).
- PR: opened once the unit tier and the browser pass are both clean.

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against the
Compose app with the 15-page Transformer paper.

**How the gestures were driven, stated plainly:** by dispatching real
`WheelEvent`s and `TouchEvent`s at the viewport, not by a trackpad or glass.
That is a genuine limit and it is recorded rather than glossed — see *What is
not verified* below.

**Confirmed**

- **ctrl+wheel zooms the paper.** 156% → 531% on one pinch-in, and back down
  through 53% → 20% pinching out. The toolbar's percentage tracks it.
- **One zoom level, not two.** After a gesture left the zoom at 20%, pressing
  the toolbar's `+` stepped to 25% — from where the gesture ended, not from
  where the control last was.
- **Two-finger touch pinch zooms the paper**, and the arithmetic is exact: a
  spread from 40px to 160px took 25% to exactly 100%. Both directions
  (100% → 50% pinching in), and **with a tool live** — "highlight" active,
  50% → 100%.
- **The page-zoom suppression mechanism works**: a ctrl-modified wheel comes
  back `defaultPrevented: true`, while a plain wheel comes back
  `defaultPrevented: false`. The second half matters as much as the first —
  swallowing ordinary scrolling would have been a new defect.
- **No layout regression from the wrapper**, which was the risk of adding an
  `inline-block` element into the reader's tree:
  - With the document wider than the panel, `documentElement.scrollWidth ===
    clientWidth` — the shell does **not** go sideways, so the defect
    `.reader`'s own comment records has not returned — while the viewport
    scrolls itself (632px of content in a 475px region), exactly as its
    contract requires.
  - With the document narrower than the panel, the wrapper centres it
    symmetrically: 121px of gap on each side, from the component's own
    `marginLeft` bookkeeping.
- **Both themes**, and **420px** and **1200px**. Pages centred, toolbar intact,
  marks from #9 still drawn in the right places at every zoom.

## What is not verified, and is owed

- **That a real trackpad pinch does not zoom the browser page.** A synthetic
  wheel event cannot trigger native page zoom, so no dispatch can prove this
  either way. What *is* proven is the mechanism that prevents it — the library
  calls `preventDefault` on exactly the ctrl-modified wheel and not on the plain
  one. Confirmation on real hardware is owed, and it is the single most
  important thing for a human reviewer to check, because it is the reported
  defect itself.
- **That a real two-finger pinch on glass behaves as the synthetic one did.**
  Emulation and touchscreens disagree about exactly this kind of thing; the
  feature's testing plan says so, which is why this is written down rather than
  assumed.

## Open items, as settled

- **Where the wrapper goes**: inside the `Viewport`, wrapping the `Scroller`.
  Settled by reading the component rather than by trying placements — it takes
  the viewport element from context to attach its listeners, and measures and
  transforms *its own* element both to preview the zoom mid-gesture and to keep
  the pages centred. Neither job works if it sits beside the pages.
- **Its `display: inline-block` needed no override.** That shrink-to-fit is
  load-bearing rather than incidental: the component compares its element's
  width against the container's to decide the centring margin, so a stretched
  wrapper would have broken centring. Verified in the browser at both
  relationships (wider than the panel, narrower than it).
- **`enableWheel` does prevent the browser's page zoom**, by `preventDefault` on
  exactly the ctrl-modified wheel — confirmed by inspecting `defaultPrevented`
  on dispatched events of both kinds. No competing listener was needed.

## Log

- 2026-08-18 — Started, immediately after #9 completed and its parent issue was
  closed by hand. Task and feature spec'd first, from research recorded in
  [../../research.md](../../research.md).
- 2026-08-18 — Implemented and browser-verified (above). The diff is one
  component and its props: the whole task was mounting something the library
  already ships, which is what the research predicted and why this was the
  smallest of the three. No defect found. Two verification limits recorded
  rather than glossed — both need real hardware, and one of them is the reported
  defect itself.
