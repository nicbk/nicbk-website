# Testing: Reader Zoom Performance

Feature-wide testing requirements. Its one task's `testing.md` names what that
task must cover.

## The shape of the problem

**The subject is a quantity, and no tier below the browser can measure it.**
jsdom draws nothing, decodes nothing, and has no compositor; the engine that
renders a page is WebAssembly behind a worker. A unit test can assert that the
reader is *composed* to render in tiles — it cannot assert that doing so made
anything cheaper.

So the tiers split cleanly here: **unit tests hold the composition, the browser
pass holds the result**, and the browser pass is primary evidence with numbers
attached rather than adjectives.

## Unit (Vitest + `@testing-library/react`, jsdom)

Assert **configuration and composition**, which is what breaks quietly:

- The tiling plugin is registered, after the plugins it depends on, with the
  configuration this reader chose — the same bar `reader-plugins.test.ts`
  already holds the other eight to.
- The page renders a base layer *and* a tile layer, in the order that puts tiles
  above the base, and beneath the layers that were already above the paper.
- **The paper still answers to being clicked.** `blank-paper.ts`'s attribute is
  what "clicked the bare paper" means, and two shipped behaviours depend on it
  (#12's tasks 3 and 6). Whichever element carries it now, a test says so.
- Existing reader tests keep passing unchanged — the toolbar, the jump, the
  sync bridge, the touch selection.

## Integration

Expected: nothing new. No table, no mutator, no route. This feature changes how
bytes already being fetched are drawn.

## Browser verification (record in the task's status.md)

Primary evidence, and it must be **the same measurement that produced the
baseline**, so the two are comparable:

- Decoded image held at fit width, at 200%, and at 400% — count of mounted page
  images and their `naturalWidth × naturalHeight`, as
  [research.md](./research.md) records them.
- Time from a zoom step to the paper being sharp again at 400%.
- **Panning at 400%**, by hand: scroll and drag around a dense page and watch
  for stalls, blank regions that persist, and seams between tiles.
- **The paper's sharpness at rest**, compared against `main`'s at the same zoom.
  A cheaper reader that is blurrier has traded the wrong thing.
- **Everything over the paper still works at high zoom**: select text, make a
  mark, open its menu, drag a touch selection handle, and watch the magnifier —
  it draws from the page image, so it is the layer most likely to notice this
  change.
- Both themes; narrow / mid / wide. Regression-hunting rather than novelty.
- **A phone, if one is to hand**: zoom to the top of the range and confirm the
  tab lives. If it cannot be tried, the status says so plainly rather than
  implying it was.

## Coverage

Ratchet applies. The composition assertions above are the coverage this feature
can honestly carry; if it comes out short, the answer is a test of something
real — the layer order, the attribute, the registration — not a test written to
move a number.
