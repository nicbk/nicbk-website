# Status: Touch Selection

**State:** In progress. Fourth of five, and added mid-feature.

- Branch: `reader-touch-and-gestures/touch-selection`, from `main` at `d288096`
  (task 3's merge).
- Sub-issue: [**#112**](https://github.com/nicbk/nicbk-website/issues/112).
- PR: opened once the unit tier and the browser pass are both clean.
- ~~On merge, close this feature's parent issue #108 by hand.~~ **That duty moved
  to [`selection-across-pages`](../selection-across-pages/status.md)** when task
  5 was split out of this one; this is no longer the last task.

## Why this task exists

Task 2 was spec'd to carry the whole touch model and could not: "long press,
then drag to select" requires reclaiming a gesture the browser has already been
allowed to pan, and no API does that. The model was re-decided with the user —
**long press selects the word, handles extend it** — and the work it implies
moved here. The full finding is in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
2026-08-22 revision.

**It also carries a gap that is open until it ships.** After task 2 a touch user
can scroll, zoom and annotate but cannot select a passage — so #9's copy control
and the four text-markup tools are unreachable by touch alone. Accepted
deliberately with the user rather than holding reading on a phone hostage to it,
and stated here so the cost is visible while it stands.

## Open items, as settled

Settled with the user on 2026-08-23, after reading the installed EmbedPDF. Three
were the design questions this task was filed with; the fourth is a scope split
the answers forced.

- **The hold: 500ms, with 10px of travel forgiven.** 500ms is what both mobile
  platforms wait (Android's `getLongPressTimeout`, and roughly what Chrome waits
  before its own context menu); 10px sits between Android's ~8dp touch slop and
  iOS's ~10pt. In practice the browser usually cancels the pointer stream first
  when it decides to pan, so this tolerance is the second line of defence rather
  than the first.
  - **Measured in screen pixels, not page ones.** The interaction manager hands
    handlers *page* coordinates — `restorePosition` has already divided the zoom
    out — so a fixed tolerance there would be four times stricter at 400% than
    at 100%. The normalized event carries `clientX/clientY`, and that is what the
    predicate uses.
- **The handle is iOS's: a bar at the boundary, a dot outside the line.** Chosen
  by the user over an Android-style dot-below-the-line and over a dot alone.
  - **It does not break the "must not obscure" constraint**, though the sketch it
    was chosen from did. A real iOS handle puts its bar *between* two characters
    and its dot **above** the line (start) or **below** it (end); the teardrop
    drawn in the question overlapped the bounding glyphs, which was the drawing's
    fault and not the platform's. The constraint stands and this satisfies it.
  - Hit target: 44×44 CSS px, well over the 24×24 WCAG 2.2 AA floor
    (`research/accessibility/conformance-target.md`), and each handle's graphic
    is offset outward so two handles on a one-word selection never coincide.
- **Extending is character-precise, with a magnifier.** The user asked for iOS's
  model whole: the boundary lands on the glyph under the finger, and a
  magnifying circle above the touch point shows what is being aimed at. Without
  the magnifier the recommendation was word snapping — a thumb covers roughly
  three characters of body text — and with it the imprecision that argument was
  compensating for is gone.
- **Feedback beyond the selection appearing: none.** `navigator.vibrate` does
  not exist on iOS Safari, so a haptic tick would make the gesture feel
  different on the two phones most likely to open this. The word highlighting
  under the finger is the feedback every platform gives.
- **Suppressing the browser's own long-press UI: two levers, narrowly aimed.**
  `-webkit-touch-callout: none` on the page layers for iOS Safari, and
  `preventDefault` on `contextmenu` **only for presses that began as touch** for
  Chrome on Android. Suppressing `contextmenu` outright would also take the
  right-click menu off the paper for mouse users, which is a silent regression
  and not what the constraint asks for.
- **Crossing a page break moved to task 5.** With character precision and a
  magnifier in scope, extending across pages — which needs page hit-testing
  under the finger and auto-scroll at the panel's edge — made this one PR of
  four subsystems. Split with the user so each is reviewable, and split *this*
  way so no interim state feels unfinished: precision ships in the same PR as
  the magnifier that makes it usable.

## What the library gives, and what it does not

Read out of the installed 2.15.0 (the latest stable — 3.0.0-next exists and is
not adoptable) before any code was written.

- **The hold's primitives are exact, not approximate.** `glyphAt`,
  `expandToWordBoundary` and `rectsWithinSlice` are exported, and the plugin's
  own double-click path is literally `glyphAt` → `expandToWordBoundary` → a range
  of `{start: {page, index: from}, end: {page, index: to}}`. A long press can
  produce exactly what a double-click produces, through the public
  `setSelection`. Page geometry is already loaded for every mounted page, because
  `SelectionLayer` loads it when it registers.
- **A pointer handler cannot tell touch from mouse.** The interaction manager
  does not forward the native event: it builds a plain object carrying
  `clientX/clientY/target/…` and **no `pointerType`**. Gating the hold to touch
  therefore needs the pointer's kind captured somewhere the handler can read it.
- **The drag handler will fight the hold unless it is stopped.** The library's
  text-selection handler takes an anchor on *every* pointerdown and begins a real
  drag-selection once the pointer moves 3 page units — about 3px of lift-jitter
  on a phone, which would replace the word just selected with a one-character
  one. Once the hold has fired, the rest of that press must not reach it.
- **`RenderLayer` revokes its blob URL the moment the image loads.** The `<img>`
  keeps showing the bitmap, but the URL is dead, so a second `<img>` pointing at
  the same `src` renders nothing. The magnifier draws from the live element into
  a canvas instead — same-origin, so untainted, and genuinely sharp: the page is
  rendered at `devicePixelRatio`, so the bitmap already holds two to three times
  the detail its CSS size shows.

## Log

- 2026-08-22 — Filed mid-feature, when task 2's implementation proved the
  decided touch model unbuildable and the user chose to split rather than hold
  the reported scrolling fix behind it.
- 2026-08-23 — Started. Library read first, four open items settled with the
  user (above), and the cross-page half split out as task 5.
