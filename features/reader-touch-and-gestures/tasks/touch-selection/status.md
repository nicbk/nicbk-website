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

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against the
Compose app with the 16-page BERT paper, in both themes, at 1400px and 500px.

**How it was driven, stated plainly:** by dispatching `PointerEvent`s carrying
`pointerType: 'touch'`, plus `TouchEvent`s and `WheelEvent`s for the pinch
checks, and by reading computed styles and the canvas back off the running page.
A synthetic touch cannot make a browser *pan* — it only pans for trusted events —
so what is verified is everything this task decides, and not the platform's own
scrolling. See *What is not verified* below.

**Confirmed**

- **A long press selects the word under the finger**, and both handles appear
  with it: 12px dots, a 44×44 target apiece, the bar 2px on the boundary, the
  start's dot above the line and the end's below it. The copy control appears
  and copies **exactly** the passage held and extended — 1964 characters
  beginning at the held word, checked by intercepting the clipboard write rather
  than trusting the highlight.
- **The selection survives the lift**, which is the whole point of withholding a
  thumb's jitter from the library's drag handler.
- **Dragging a handle moves that boundary and nothing else**: the end walked
  641 → 702 → 903 while the start stayed at 572, and the lens stayed up
  throughout. Releasing keeps the selection and takes the lens away.
- **The magnifier shows real detail, not an upscale**: the page's bitmap is
  2311px wide behind a 1155px element, so 2× is spending pixels that were
  rendered. It draws the selection tint and the caret as well as the words,
  floats above the finger, and clamps inside the panel when dragged to the
  margin (right edge 482 against a panel ending at 488).
- **Handles follow the zoom** — a 12px line at 76% is 32px at 244% — and the
  selection stayed on the same word across two zoom changes.
- **Escape drops the selection and the handles.**
- **A mouse drag still selects and grows no handles.** Pointer selection is
  exactly what #9 left.
- **The browser's own long-press UI is declined for touch only**: a
  `contextmenu` after a touch press comes back `defaultPrevented`, after a mouse
  press it does not. `-webkit-touch-callout` is in the stylesheet and cannot be
  read back in Chrome, which does not implement it — it is iOS Safari's lever.
- **A live tool still owns the drag**: the page takes its inline
  `touch-action: none`, a hold selects nothing, and a touch drag still draws —
  counted in the database, 17 → 18, and the test mark removed again.
- **Tasks 1 and 2 are not regressed**: `touch-action` computes to `pan-x pan-y`
  with no inline value when no tool is live; ctrl+wheel zooms (76% → 244%,
  `defaultPrevented`); two-finger pinch zooms and the arithmetic is still exact
  (244% → 122% when the spread halved).

## Two defects found in the browser, and fixed

Both are recorded at length because the *reason* generalizes, and because
neither was reachable by reasoning about the code alone.

- **The first move of a handle drag deleted the selection it was adjusting.**
  The hold swallowed its own pointer-up to keep a lifting thumb's jitter away
  from the library's drag handler — and that handler drops its anchor *only* on
  pointer-up. Left holding a point from a gesture that had ended, it measured
  the next movement it heard against it, found it far away, and started a drag
  selection. Fixed twice over: the lift is let through (no drag has begun, so
  all the handler does with it is forget), and the grip now stops its whole
  gesture rather than only its first event.
- **A thumb drag on the paper still selected text** — the second half of what
  the user reported on 2026-08-17, which task 2 was thought to have closed. The
  library turns movement into a drag selection three page units after a press
  lands, so a scroll dragged a selection along with it and raised the copy
  control over moving paper. Now every move of a *touch* press is withheld from
  it: by decision a finger selects by holding and adjusts by handle, so that
  drag no longer belongs to one.
  - **And withholding only worked after the registration moved to a layout
    effect.** Handlers registered without a mode are walked in registration
    order, so this had to be ahead of the selection plugin's — and rendering the
    component earlier in the tree was not enough, because React runs *every*
    layout effect before *any* ordinary one and the plugin registers from an
    ordinary one. A unit test pins the ordering, since losing it fails silently.

## Two design faults found in the browser, and fixed

- **The handles used `--color-accent`, which is the wrong token on paper.** A
  page is white in both themes; in dark mode that token is a pale blue chosen to
  carry against a dark surface, and over white — against EmbedPDF's own blue
  selection — it nearly vanished. They now use a fixed deep blue with a white
  ring, which reads on paper, on the selection, and on a dark figure alike.
- **The copy control sat exactly on the start handle.** Both float above the
  first line of a selection, so the reader reaching to adjust where their
  passage begins pressed "copy" instead. The menu now clears the handle's dot —
  applied to every selection rather than only a touch one, because a menu a few
  pixels further from the passage costs a pointer reader nothing and a
  conditional rule would be a rule to keep in step from two stylesheets.

## What is not verified, and is owed

- **That any of this feels right under a real thumb.** Every gesture here was
  synthesized. The thresholds especially — 500ms, 10px — are platform norms
  rather than measurements, and the case that will judge them is the slow drag
  that nearly holds. It needs a phone.
- **That the browser's own panning is untouched.** Synthetic touches never pan,
  so the mechanism was checked (the property, the value, which element carries
  it, through a full tool cycle) rather than the scroll.

## Log

- 2026-08-22 — Filed mid-feature, when task 2's implementation proved the
  decided touch model unbuildable and the user chose to split rather than hold
  the reported scrolling fix behind it.
- 2026-08-23 — Started. Library read first, four open items settled with the
  user (above), and the cross-page half split out as task 5.
- 2026-08-23 — Implemented and browser-verified (above). **Four faults found by
  looking, none by the unit tier**: two behavioural (a handle drag deleting its
  own selection; a scrolling thumb still selecting text — the half of the
  original report task 2 was thought to have closed) and two visual (handles
  invisible on white paper in dark mode; the copy control sitting on top of the
  start handle). All four fixed and re-checked. The behavioural pair share a
  root: this reader now takes gestures the library also wants, and taking one
  means understanding when the library resets — and being first in a list whose
  order React, not the component tree, decides.
