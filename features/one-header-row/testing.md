# Testing: One Header Row

## What the unit tier can and cannot do here

jsdom lays nothing out. Every rectangle it reports is zero, so **no unit test can
measure that the two headers are the same height** — the thing this feature
exists to guarantee. That is not a reason to skip the tier; it is a reason to be
precise about what each tier is for:

- **Unit tests assert the source of the height**, not the height. If both
  headers' rows resolve to the same declared value and neither stylesheet
  computes its own, the heights follow.
- **The browser asserts the height**, by measured rectangle, on real routes, in
  both engines.

The precedent for asserting a stylesheet's contents from a unit test is
`pdf-reader.test.tsx` and `collection-toolbar.test.tsx`, which read the CSS file
with `readFileSync` and assert on declarations. `collection-toolbar.test.tsx`
also carries the lesson to reuse: **strip comments before matching**, because a
comment explaining a property matched the assertion looking for it.

## Unit

- **Both headers render the shared row.** Neither `site-header.module.css` nor
  `lit-tracker-header.module.css` declares `min-height`, `padding-block`,
  `font-size` or `border-bottom` of its own — the row owns all four. This is the
  test that fails when someone "just adjusts the padding" on one of them.
- **The shared row declares the height once**, as `min-height` rather than
  `height`, so an oversized item grows the row instead of being clipped.
- **The row positions nothing.** No `position` in `header-row.module.css`; the
  site header's `position: sticky; top: 0; z-index: 1` is still present in its
  own stylesheet, composed onto the row.
- **Every existing header test still passes unchanged.** Both files' current
  tests — the site name's destination, exactly three nav links, no auth UI and no
  active-page indication; the tracker's app-name link, its path pointing at the
  personal site rather than the tracker, the site owner's name rather than the
  signed-in user's, and the right-hand group's order — are the regression suite
  for "the items did not move". They are not rewritten.
- **The shared row renders a `<header>` landmark**, once, with its children in
  order.

## Browser (the tier that actually decides this feature)

Measured by `getBoundingClientRect()` on the live `<header>`, never read off a
screenshot, on the local Compose stack and then in Safari.

| Check | How |
|---|---|
| every route agrees | measure `/`, `/blog`, `/about`, `/projects`, `/lit-tracker` at one width; all equal |
| the tracker matches the site | the pair that started this, at desktop and at phone width |
| **Safari agrees with Chrome** | same routes, same numbers; the site header's fractional height is gone, so both engines should report the same integer |
| sticky still sticks | scroll a long page (`/blog` or a post) and confirm the row stays at `top: 0` and page content passes under it |
| the tracker still does not scroll | the shell is one viewport tall; the document gains no scrollbar |
| 320px | neither header wraps; the tracker's app name truncates before the toggle is pushed off |
| both themes | the surface colour and the divider read correctly in each |

The pre-change numbers are recorded in [research.md](./research.md) and are the
baseline the post-change measurement is compared against.

## Not covered

**No e2e specs.** Deferred project-wide until the tracker is built out; unit
tests plus browser verification stand in, per the standing decision.

## Coverage

The ratchet (`scripts/coverage-ratchet.mjs`) is strict — `current < baseline`
fails. The new component is small and fully exercised by the tests above; the
baseline is updated only if coverage genuinely rises.
