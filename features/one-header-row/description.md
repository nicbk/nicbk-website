# Feature: One Header Row

**#17** in [../index.md](../index.md). The site's header and the tracker's stop
being two rows that happen to look alike, and become one row with two sets of
items.

## What it is

Move between `nicbk.com/blog` and `nicbk.com/lit-tracker` and the header shifts
by a pixel. It is not a rendering artifact — it is what the two stylesheets
compute, independently, from different inputs:

| | site / blog | lit-tracker |
|---|---|---|
| padding-block | `--space-md` (16px) | `--space-sm` (12px) |
| tallest item | nav link text, 25.6px | account avatar, 32px |
| border | 1px | 1px |
| **height** | **58.59px** | **57.00px** |

Measured in Chrome at 1440px and in Safari on `nicbk.com` at 1110px, where the
site row reports a flat **58** against the tracker's **57**. The user reported
the difference and, when shown the numbers, confirmed that the single pixel is
what they are seeing.

**Neither number is written anywhere.** Both are sums, and the two summands were
chosen independently: the tracker's padding is smaller precisely *because* its
avatar is taller, a compensation that lands 1.6px away from the row it was
compensating towards.

## Why it is worth a feature

Because the bug is not the pixel, it is that **the agreement is a coincidence**.
Nothing declares these two rows the same height and no test holds them there. Add
one control taller than 25.6px to the site header, or drop the avatar from the
tracker's, and they diverge by 8px with everything still green. This is the same
class AGENTS.md already names — *an order you did not choose is not an order you
can rely on* — in the one dimension the guideline did not anticipate, which is
size rather than sequence.

It is also worth doing as a **merge rather than a matching pair of numbers**,
because that is what the user asked for and because two stylesheets that must
agree are exactly the duplication AGENTS.md warns is "where the two copies drift
out of sync". They already did.

## What it delivers

- **One row component**, owning the horizontal rhythm, the type scale, the
  surface, the divider below, and — new — a **declared height** rather than a
  computed one.
- **Two item sets**, which is the only thing that differs between the two
  headers: name + nav links + toggle on the site, app name + article + path +
  account + toggle in the tracker.
- **A test that fails if the two rows stop agreeing**, so the next control added
  to either cannot silently move one of them.

## What it does not do

- **It does not merge the two shells.** The site header is `position: sticky` in
  a page that scrolls as one unit; the tracker's is the fixed top edge of an app
  shell whose document never scrolls. That difference is real, decided, and
  stays — the shared piece is the row, not where the row sits.
- **It does not unify the items.** The personal site still has no auth UI in its
  header and the tracker still has no `projects`/`blog`/`about` links. Both
  remain what their decided specs say they are.
- **It does not introduce a global layout-token scale.** One height, declared in
  the one stylesheet that now owns the row, following the precedent
  `--reader-toolbar-height` already set.

## Exit state

The header is the same height on every page of the site, because one value says
so rather than two sums arriving near each other. Moving from the blog to the
tracker shifts nothing. And the two headers' contents are the only difference
left between them, which is what the user asked for in the first place.
