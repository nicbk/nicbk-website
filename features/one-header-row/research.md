# Research: One Header Row

Traceability from this feature back into `research/*.md`, plus the measurements
taken before it was spec'd.

## Decided documents this feature builds on

- [research/ui-ux/pages/site-wide/components/header.md](../../research/ui-ux/pages/site-wide/components/header.md)
  — Decided 2026-07-02. Structure (bold name left, three nav links, thin divider
  below), no auth UI, no active-page indication, single row at every width with a
  `clamp()`ed font, and **sticky**.
- [research/ui-ux/pages/lit-tracker/components/header.md](../../research/ui-ux/pages/lit-tracker/components/header.md)
  — Decided 2026-07-04, revised 2026-08-02. App name, article title, breadcrumb
  path, account avatar, theme toggle; **fixed app-shell edge, not a sticky page
  header**.
- [research/coding-conventions/styling-conventions.md](../../research/coding-conventions/styling-conventions.md)
  — CSS Modules, `composes:` for shared declarations, hover affordances gated on
  `@media (hover: hover)`.

## The decision this feature re-opens

Both documents say, in as many words, that the two headers are **separate
components and not variants of one**:

> A separate component from the [site header](…) (not a variant of it) — each
> sub-application gets its own header.

> Distinct from the lit-tracker header — see […].

**The user re-decided this on 2026-09-13**, after seeing the measurements below:
merge them into a single component so the heights are the same by construction,
and handle the differences from there. Both documents get a revision recording
the change and what survives it — which is most of their content, because what
they actually decide is each header's *items*, and those do not change.

The reason the original decision is safe to reverse is that it was about
**identity**, not layout: each sub-application should look like itself in its own
header. Sharing the row does not take that away; the items are still entirely
separate, and the one thing the two never disagreed about on purpose — how tall a
header row is — is the only thing being unified.

## Measurements taken before spec'ing (2026-09-13)

Every figure from `getBoundingClientRect()` on the live `<header>`, not read off
a screenshot.

| Surface | Chrome @1440 | Chrome @500 | Safari @1110 |
|---|---|---|---|
| `/blog` (site header) | **58.59** | 57.00 | **58** |
| `/lit-tracker` | **57.00** | 57.00 | **57** |

Chrome ran against the local Compose stack; Safari against `nicbk.com`, where the
report came from. Notes:

- **The rows agree exactly at 500px** and diverge only once the font clamp tops
  out, because below that the site header's tallest item is its 24px theme toggle
  rather than its text.
- **The site header's height is fractional** — 58.59px — since `1rem × 1.6`
  line-height lands on 25.59px. Safari reports the same row as a flat 58. A
  fractional box against a 1px border is the kind of thing two engines resolve
  differently, which is a second reason to declare the height rather than derive
  it.
- **The tracker row is the shorter of the two**, which is the opposite of what
  "the tracker header is a different height" suggested, and is why this was
  measured before anything was written.

## What the measurement ruled out

- **A transient height during load.** `LitTrackerShell` renders the header in
  both the pre-hydration fallback and the hydrated branch, with the account — and
  therefore the 32px avatar — present in both. There is no moment where the row
  is 50.6px and then grows.
- **A third header.** `SiteHeader` is rendered only by `SiteShell`;
  `LitTrackerHeader` only by `LitTrackerShell`. No page renders its own.
- **Anything depending on the current heights.** Nothing in the tree uses a
  header-height value: `LitTrackerShell`'s grid row is `auto`, and the only
  `scroll-padding-top` in the project belongs to the reader's own toolbar.

## Precedent this feature follows

- **`--reader-toolbar-height: 2.5rem`** in `pdf-reader.module.css` — a layout
  metric declared as a custom property in the stylesheet that owns it, rather
  than promoted into `src/styles/`. The header row's height follows the same
  pattern for the same reason: exactly one place needs to know it.
- **`composes:`** — already used across the tracker's dialogs to build a variant
  from a shared class (`article-edit-dialog.module.css` and siblings). It is how
  the two headers add their positioning to the shared row without a class-merging
  helper, which matters because the project has no `clsx`.
