# Status: One Row, Two Item Sets

**State:** Implemented, awaiting review. Task 1 of 1.

- Branch: `one-header-row/one-row-two-item-sets`, from `main` at `1cbb6e8` with
  the feature spec merged.
- Sub-issue: [**#157**](https://github.com/nicbk/nicbk-website/issues/157).
- PR: **TBD**.
- **On merge this completes #17** — check the parent issue
  [#156](https://github.com/nicbk/nicbk-website/issues/156) and close it by hand
  if it has not closed itself, which on the last three features it has not.

## Why this task exists

The site's header measured 58.59px and the tracker's 57.00px, and the difference
is visible to the user. Neither number was declared anywhere: both were sums of a
padding chosen in one file and whatever that row's tallest item happened to be.
The fix is not to make the two sums equal — it is to stop having two.

## What shipped

- **`header-row/`** — the `<header>` element and the row's whole stylesheet:
  flex, the `--header-inline-space` clamp, the type clamp, `nowrap`, the surface,
  the divider, and `min-height: 3.5rem` in place of both `padding-block` values.
- **Both headers reduced to items.** `site-header.module.css` keeps only
  `position: sticky; top: 0; z-index: 1` plus its link styling;
  `lit-tracker-header.module.css` has **no `.header` rule at all** — its row
  needed no placement, so it passes no class.
- **Both decided docs revised**, in the spec PR that preceded this one.

## One deviation from the spec, and why

The spec said each caller would `composes:` the shared row into its own class.
**The implementation applies the row class in the component instead**, appending
the caller's class to it.

`composes:` would have worked, but it puts the invariant in the callers' hands: a
third header could pass a class that simply forgot to compose the row, and
nothing would say so. Applying it in the component makes "every header on this
site is this row" unforgettable, and it sidesteps `composes:`'s ordering rule —
which the task's own constraints had to spend a paragraph explaining. The project
has no `clsx` and this did not introduce one; two classes join with a template
literal.

## What the browser found

Nothing. Which is worth saying plainly, because the last three tasks each found
something the unit tier could not, and the difference here is that this change
*removes* a computation rather than adding one.

### Chrome, local Compose stack, 2026-09-13

| Check | Result |
|---|---|
| `/`, `/blog`, `/about`, `/projects`, `/lit-tracker` @1440 | **56.00px, all five** (from 58.59 / 58.59 / 58.59 / 58.59 / 57.00) |
| both headers @500 | **56.00px** each |
| site header still sticky | scrolled 900px: row held `top: 0`, overlap with page content **asserted**, hit-test at the overlap centre answered **HEADER** |
| tracker document still does not scroll | `scrollHeight === innerHeight`; the panels scroll inside the shell |
| no wrap, no sideways scroll | at 500px, on both; the theme toggle stays fully on screen |
| dark theme | 56.00px, surface `rgb(31,31,31)`, divider legible on both |

### Safari, 2026-09-13

The engine that reported the old site header as a flat **58** where Chrome
computed **58.59** — the fractional height was half of why this feature exists.

| Check | Result |
|---|---|
| `/blog`, new build | **56.00px**, `min-height: 56px`, `position: sticky`, `z-index: 1` |
| a 32px item appended to the row | row stays **56.00px** — the avatar cannot grow it |

**The integer is the result.** Both engines now report the same number because
both read the same declaration, which is the thing the feature was for.

## What is not verified, and why

- **The tracker header in Safari.** `localhost:3000` has no session there and
  signing in is not the agent's to do; Safari redirects to `/sign-in`, which
  renders the *site* header. What stands in for it is stronger than the usual
  argument: the tracker's stylesheet declares no row properties at all — asserted
  by test — so it renders the identical rule Safari was measured on, and the one
  way it could have differed (its 32px avatar forcing the row taller) was probed
  directly in Safari and does not.
- **320px.** Chrome's minimum window width stopped the resize at 500px, so the
  narrowest measured is 500. The narrow-width properties (`flex-wrap: nowrap`,
  `white-space: nowrap`, both clamps) moved to the shared row **unchanged in
  value**, and they are now one set rather than two.

## Log

- 2026-09-13 — Implemented. 1612 unit tests pass (1605 + 7). The regression test
  was checked by reproducing the bug — re-adding `padding-block` to the site
  header's rule — and confirming it fails, then passes again when removed.
- 2026-09-13 — Spec'd.
