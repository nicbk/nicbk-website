# Task: One Row, Two Item Sets

Task 1 of 1 of [one-header-row](../../description.md) (#17).

## What it does

Extracts the header row into a shared component, makes both headers render it,
and replaces the two computed heights with one declared one.

After this, the only difference between the site's header and the tracker's is
what is in them — plus where each one sits, which is the caller's business and
stays that way.

## What changes

**New:** `src/routes/-shared/components/header-row/` — `header-row.tsx`,
`header-row.module.css`, `header-row.test.tsx`. The component renders the
`<header>` landmark and nothing else; the stylesheet owns the row.

Moving into the shared stylesheet, out of both headers:

- `display: flex; align-items: center`
- `--header-inline-space: clamp(0.5rem, 2.5vw, 1.5rem)`, its `gap` and its
  inline padding — still cascading to descendants, which `.nav` relies on
- `font-size: clamp(0.75rem, 2.5vw, 1rem)`
- `flex-wrap: nowrap; white-space: nowrap`
- `background-color: var(--color-bg-surface)`
- `border-bottom: 1px solid var(--color-border)`

Replacing the two `padding-block` values: `min-height: 3.5rem`, with a small
`padding-block` kept as the floor for an item that ever exceeds it.

**`site-header.tsx` / `.module.css`** — renders `<HeaderRow>` with its items.
Its stylesheet keeps `position: sticky; top: 0; z-index: 1` (composed onto the
shared row and passed in as `className`), the site-name and nav-link styling, the
hover rules, and the `> :last-child { margin-left: auto }` that pushes the
toggle over.

**`lit-tracker-header.tsx` / `.module.css`** — the same, with no positioning at
all. Its stylesheet keeps the divider, the page title, the breadcrumb group, the
app-name truncation and its hover rules.

**Both decided docs get a revision** recording the reversal, since both currently
state the opposite.

## What it does not change

- The items in either header, their order, or their destinations.
- Either shell's layout model.
- The tracker's truncation behaviour, or the site header's single-row-at-every-
  width behaviour.
- Anything about the theme toggle or the account avatar themselves.

## Why one task

The three moving parts — the shared row, the two callers — are one change. A task
that landed the component without its callers would put an unused file on `main`;
one that converted a single header would leave the two rows further apart than
they started, since the whole point is that they agree.
