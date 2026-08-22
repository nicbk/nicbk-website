# Research: Reader Touch and Gestures

Traceability for #12, per
[../../research/project-management-conventions/feature-definition-and-scoping.md](../../research/project-management-conventions/feature-definition-and-scoping.md).
Unusually for this project, the load-bearing research here is **measurement of
the installed library**, not a decision to look up — so this file records what
was found in EmbedPDF 2.15.0 alongside the decided docs it builds on.

## Decided documents this implements

- [research/ui-ux/pages/lit-tracker/components/reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  — the reader's decided interaction model, including its 2026-08-16 revision
  ("putting a selection down has two ways out"), which this feature extends to
  the touch gestures that revision did not consider. **Its 2026-08-18 revision
  is this feature's own**, recording the touch model decided with the user.
- [research/ui-ux/design-system.md](../../research/ui-ux/design-system.md) —
  two sections, and the first is the reason this feature exists:
  - *Scrolling: no visible scrollbars, and no overscroll bounce* (2026-08-09)
    states that scrolling itself is untouched and "wheel, trackpad, keyboard,
    and touch all work". The reader breaks the touch half of that claim.
  - *Responsive/mobile layout conventions* (2026-07-02) — mobile-first, with
    the breakpoints #9's reader already honours.
- [research/technologies/pdf-reader-annotations.md](../../research/technologies/pdf-reader-annotations.md)
  — why EmbedPDF, and specifically why its **headless** build was chosen over
  its drop-in viewer. That decision is what makes this feature necessary at all:
  the prebuilt viewer mounts these gestures for you, and taking the headless
  path means mounting them deliberately.

## What the installed EmbedPDF actually provides

Verified against **2.15.0** on 2026-08-17 by reading the installed package, per
research-over-recall. Three findings, and each one decides a task.

### `ZoomGestureWrapper` exists and was never mounted

`@embedpdf/plugin-zoom/react` exports `ZoomGestureWrapper`, taking `enablePinch`
and `enableWheel` — **both defaulting to `true`**. `enableWheel` handles
ctrl/cmd + wheel, which is what a trackpad pinch emits in every browser.

`grep` for `wheel|touch|pinch` across `src/routes/lit-tracker/-article-detail/reader/`
returns only prose in comments. So both pinch complaints are one missing
component rather than two missing behaviours, and neither needs gesture maths of
this project's own.

### `touch-action: none` is imposed by an interaction-manager default

`plugin-interaction-manager/dist/react/index.js` sets, on every page element:

```js
element.style.touchAction = attachedWithRawTouch ? "none" : "";
```

where `attachedWithRawTouch` resolves `getActiveInteractionMode()?.wantsRawTouch
!== false`. The built-in default mode — `pointerMode`, registered by the plugin
itself — **does not set `wantsRawTouch`**, so it reads as `true` and the page
gets `touch-action: none`. That switches off native scrolling *and* native pinch
for touch, which is the reported "scrolling just selects text".

Two properties of that mechanism make the decided touch model cheap rather than
a rewrite:

- **`wantsRawTouch` is per interaction mode**, and the annotation plugin
  registers a mode per tool (`registerInteractionForTool`, mode id
  `tool.interaction.mode ?? tool.id`). So "no tool active scrolls, a live tool
  draws" maps exactly onto the lever the library already has.
- **`registerMode` is a plain `Map.set`** (`plugin-interaction-manager/dist/index.js`),
  so re-registering `pointerMode` replaces it rather than erroring.

### There is no built-in long-press

Neither the selection plugin nor the interaction manager exposes anything like
`longPress`, `holdDelay` or `pressDelay`. The selection plugin has
`minSelectionDragDistance`, and word/line selection on double- and triple-click,
and nothing else in that family.

So **the long-press-to-select half of the decided touch model is this project's
own code**, and is the feature's main unknown. It is deliberately isolated in
its own task for that reason, and that task's spec says what happens if the
gesture cannot be made to sit correctly on top of EmbedPDF's model.

## What was measured, not assumed

The click-away-also-creates defect is a consequence of two decisions meeting,
not a library bug — worth recording so it is not "fixed" by reversing either:

- `deactivateToolAfterCreate: false` in `reader-plugins.ts`, decided with the
  user so a reader marking six passages picks the tool once
  (reader-annotation.md's creation-flow bullet).
- The engine's shape tools carry `clickBehavior: { enabled: true, defaultSize:
  { width: 100, height: 100 } }`, so a bare click on the page creates a mark.

Both are wanted. What is not wanted is the *third* thing they produce together,
and that is what task 3 removes.

## Gaps this feature closes rather than inherits

`reader-annotation.md` said nothing about touch before this feature: every
gesture it decided is a click, a drag with a pointer, or a key. The touch model
— what one finger does, what two do, and how text is selected without a mouse —
is decided with the user in this feature's own revision of that document, which
is written **before** the task that implements it, per the rule that a decision
gap is resolved before implementation rather than improvised inline.
