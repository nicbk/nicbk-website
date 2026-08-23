# Testing: Tiled Rendering

What this task's tests must cover, within
[#14's testing requirements](../../testing.md).

## Unit (Vitest + jsdom)

- **`reader-plugins.test.ts`** — the tiling plugin is registered, and after the
  render, scroll and viewport plugins it declares as dependencies. The existing
  test asserts the registered set and its order; this extends it rather than
  adding a second list beside it.
- **`pdf-reader.test.tsx`** — a page renders both a base image layer and a tile
  layer, with the tile layer above the base and both beneath the selection and
  annotation layers. Asserted through what the layers are recognised by, not
  through EmbedPDF's internals.
- **The bare-paper attribute** is on the element a press actually lands on, and
  `isBlankPaper` still answers `true` for it. This is the assertion that would
  have caught the click-away regression this task could cause, so it is written
  as a claim about behaviour rather than about markup.
- Whatever configuration this reader chooses (tile size, overlap) is stated in
  one place and asserted there — a constant with a test, not a literal in JSX.

**What is not asserted, deliberately:** that tiles are cheaper. jsdom decodes
nothing. A unit test that mocked the plugin and counted tiles would assert the
mock.

## Integration

Nothing new. No table, no mutator, no route touched.

## Browser verification (record the numbers in `status.md`)

Primary evidence, taken the same way the baseline in
[../../research.md](../../research.md) was, so the two compare:

1. **Memory** — at fit width, 200% and 400%: how many page images are mounted
   and what their natural dimensions are, plus the decoded total.
2. **Latency** — time from a zoom step at 400% to the paper being sharp again.
3. **Panning at 400%** — drag and scroll around a dense page; watch for stalls,
   persistent blank areas and seams.
4. **Sharpness at rest** — the same page at the same zoom, next to `main`.
5. **Every layer over the paper at 400%** — select text and copy it, make a mark
   and open its menu, click the bare paper with a tool live (it must deselect
   and create nothing), drag a touch-selection handle and watch the magnifier.
6. **Both themes, narrow / mid / wide**, hunting for regressions rather than
   novelty.
7. **A phone**, if one is to hand: zoom to the top of the range and confirm the
   tab lives. If not tried, say so.

## Coverage

Ratchet applies. The composition assertions above are what this task can
honestly carry; if the ratchet still complains, the answer is a test of the
layer order or the attribute, not a test written to move a number.
