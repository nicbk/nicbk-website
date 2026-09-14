# Plan: One Header Row

One task. The change is a single coherent move — the row becomes a component,
both headers compose it, the height stops being a sum — and splitting it would
mean landing a half-merged header on `main`.

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`one-row-two-item-sets`](./tasks/one-row-two-item-sets/description.md) | [#157](https://github.com/nicbk/nicbk-website/issues/157) | The shared row, both headers composing it, one declared height, and the test that holds them together |

## Shape of the work

**A new shared component** at
`src/routes/-shared/components/header-row/`, holding the `<header>` element and
the row's own stylesheet: flex, centred, the `--header-inline-space` clamp, the
font clamp, `nowrap`, the surface colour, the divider below, and
`min-height: 3.5rem`. It takes the items as children and a `className` for the
caller's positioning, and it positions nothing itself.

It lives under `-shared/` rather than beside either header because both
sub-applications use it — the same placement `theme-toggle` already has, which is
the closest precedent: a component the tracker reaches into the site's shared
folder for.

**Both headers become item lists.** `SiteHeader` and `LitTrackerHeader` keep
their names, their files, their tests and their doc comments; what leaves them is
the `<header>` element and every declaration about the row. `site-header.module.css`
keeps only `position: sticky; top: 0; z-index: 1` (composed onto the shared row)
plus its link styling; `lit-tracker-header.module.css` keeps its divider, title,
breadcrumb and truncation rules.

**Then the two decided docs get their revisions** — the sections that say
"separate component, not a variant" are the ones being reversed, and both say it,
so both are edited in the same task that makes it true.

## Risks, and what makes each survivable

- **The sticky move.** `position: sticky` is being relocated from the element's
  own stylesheet to a composed class. Sticky is notoriously sensitive to
  ancestors — an `overflow` anywhere up the tree kills it silently. Nothing about
  the DOM changes here, only which class carries the declaration, but *silently*
  is the operative word: this needs a scroll in a real browser, not a stylesheet
  assertion.
- **The 1px the user can see.** The whole feature exists because a small
  difference was visible, so "close enough" is not a passing result. Verification
  is by measured rectangle on every affected route, in both engines.
- **Safari.** Two of the last three visual defects on this project behaved
  differently in Safari, and the site header's fractional height is exactly the
  sort of thing that rounds differently. Safari is a required check here, not an
  optional one.

## Dependencies

Depends on **#1 `app-shell-and-home`** for the site header and shell, and on
**#7/#8** for the tracker's. It touches every page on the site, which is an
argument for doing it now rather than after more surfaces are built on top of
either header.
