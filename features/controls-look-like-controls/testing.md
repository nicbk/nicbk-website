# Testing: Controls Look Like Controls

## What each tier is for here

jsdom computes no layout and resolves no custom properties to real colours, so
the unit tier cannot answer "is the heading visibly quieter than the toggle". It
can answer **which token each one takes**, which is the thing that regresses when
somebody edits one of the two rules.

- **Unit** — the token relationship, and that the pressed state still differs
  from the resting one by both colour and weight.
- **Contrast tests** — `src/styles/contrast.test.ts` already holds the muted
  token at 4.5:1; the new resting colour is `--color-text`, which it also covers.
- **Browser** — that the rail now reads correctly, in both themes, on both
  surfaces. And for the "+", a measured aspect ratio.

## Unit

- **The group label takes the muted token and the toggle takes the text token**,
  asserted from the stylesheets. One test covering `tag-toggle.module.css`
  against both `filter-groups.module.css` and `tag-filter.module.css`, because
  the relationship is what matters and it holds across two surfaces. Strip
  comments before matching (`collection-toolbar.test.tsx`'s lesson).
- **The pressed state still carries weight as well as colour** — the WCAG 1.4.1
  pairing that becomes load-bearing once resting and pressed are closer together.
- **The trigger declares equal width and height**, so a future edit to the row's
  alignment cannot silently stretch it again.
- **The icon rule resolves to whole pixels** at the font sizes it is used at.
- **The picker keeps `type="file"` and `multiple`**, so the styling change cannot
  quietly become a replacement of the control.
- Existing tests for the filter rail, the blog filter, the upload modal and the
  upload status all pass unedited.

## Browser

Both themes, and the tracker's rail seeded with **enough tags to look like a real
collection** — a rail with two tags does not show whether the hierarchy reads.

| Check | How |
|---|---|
| the rail reads | heading measurably darker/lighter than the toggles; confirm by computed colour, not by eye |
| the pressed state still stands out | select a tag; accent + bold, distinct from the new resting colour, **in both themes** |
| the blog filter | same two checks on `/blog`, which this also changes |
| the "+" is square | measured rect, width === height |
| the toolbar still lines up | the "+", the indicator and the search field agree on height, as `stretch` was added to ensure |
| the picker | dotted boundary visible; the control still opens the platform dialog and still takes several files |
| the spinner | box measures a whole number of pixels; **the wobble itself is the user's call** |
| phone width | the rail's drawer shows the same hierarchy as the rail |

## Not covered

**No e2e specs** — deferred project-wide until the tracker is built out.

**Whether the wobble is gone.** The artifact is below what the agent can resolve;
the frozen-phase probe is recorded in [research.md](./research.md) along with why
it was not conclusive. The PR says plainly that one candidate was removed.

## Coverage

The ratchet is strict (`current < baseline` fails). These are stylesheet and
attribute changes with tests attached, so coverage should hold; the baseline
moves only if it genuinely rises.
