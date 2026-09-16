# Plan: A Note Fits the Margin

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-text-box-fits-a-margin`](./tasks/the-text-box-fits-a-margin/description.md) | TBD | The `freeText` override: 8pt, a 72pt click box, and its verification against real margins |

## Why one task

The change is one tool override and its tests. There is no data, no pipeline and
no second surface to sequence against it.

## Risks

- **A partial override drops the rest of the tool's defaults.** The plugin
  replaces top-level fields rather than merging them, so the override spells
  `defaults` and `clickBehavior` in full; a unit test asserts the colour and the
  subtype survive.
- **8pt is a judgement about legibility**, made against character counts rather
  than against a reader's eyes. It is checked in the browser at a phone's width
  as well as a desktop's, and it is one line to change if it reads too small.

## Dependencies

#9 (the reader and its annotation tools).
