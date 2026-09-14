# Research: A Paper Opens Where You Left It

Measured 2026-09-14 before the spec was written.

## 1. Nothing records a position today

- `articles` has `status`, `notes`, `created_at`, `updated_at`; no position or
  "last opened" column (`src/db/schema/lit-tracker.ts`).
- The only `localStorage` use is the theme (`src/theme.ts`).
  `research/coding-conventions/state-management-conventions.md` keeps server
  data in Zero, shareable UI state in search params, and transient state in
  `useState`; the theme is the one browser-storage exception.
- No research or feature doc decides anything about a reading position; #21
  deferred it here by name.

## 2. The pattern to follow exists

Reading status: `articles.setStatus` — a Zero custom mutator that runs
optimistically on the client and authoritatively on the server, takes the owner
from the session (`ctx`), checks ownership with `requireOwnedArticle`, and writes
one column (`src/zero/mutators.ts`). Notes are written the same way through
`use-synced-text.ts`, debounced by a second and flushed on unmount — the nearest
precedent for a value that changes often.

`updated_at` is not touched by `setStatus` or `setNotes`; Zero writes bypass
Drizzle's `$onUpdate`. A reading position must not touch it either: reading a
paper is not editing it.

A new column on an existing table needs: the Drizzle schema, an entry in
`drizzle-zero.config.ts` (an allowlist), the regenerated `schema.gen.ts`, and a
`drizzle-kit` migration. CI's Zero schema drift check covers the generated file.

## 3. The reader can tell where it is, and be sent back

EmbedPDF 2.15.0's scroll plugin:

- `onScroll` reports `pageVisibilityMetrics`; the top visible page's
  `original.pageY` is how far down that page the view starts, **in page points**
  — independent of zoom.
- `scrollToPage({ pageNumber, pageCoordinates, behavior: 'instant' })` scrolls
  to a page point.
- `onLayoutReady` (on the capability, not the per-document scope) fires with
  `isInitial: true` once, after the zoom plugin has applied FitWidth and the
  scroller has laid pages out. There is no "initial page" config option.

## 4. Measured: restoring works, and a naive round trip drifts

A temporary probe in the local reader (not committed), *Attention Is All You
Need*, Chrome, 152% FitWidth:

| restore asked for | top page read back | offset read back |
|---|---|---|
| p. 9, 400pt | p. 9 | **407** |
| p. 9, 407pt (the value read back) | p. 9 | **413** |
| p. 9, 400 − 10/1.516 pt | p. 9 | **399.96** |

- **The restore holds.** Done in the first `onLayoutReady` listener, it lands on
  page 9 and is unchanged 2.5 seconds later — no FitWidth recalculation undid it.
- **A naive round trip creeps ~7pt per open.** `getScrollPositionForPage` adds
  the viewport's `viewportGap` (10px by default) to the position it scrolls to,
  and the reported page offset excludes it. Subtracting `viewportGap / scale`
  makes the round trip exact.
- ~~**#22's "go to p. N" has the same 10px error**~~ — wrong; see §4a.

### 4a. Correction, measured during task 2: the error is in the reading

Measured against the DOM rather than against the metrics (Chrome, 152%,
p. 5):

| `scrollToPage` asked for | page actually at (DOM) | `original.pageY` reported |
|---|---|---|
| 0 pt | 0.12 pt | 6.71 pt |
| 400 pt | 399.86 pt | 406.45 pt |

The viewport element has `padding: viewportGap`. `getScrollPositionForPage`
counts it, so **the scroll is exact**. `calculatePageVisibility` compares
`scrollTop` with page positions that leave it out, so **the reported offset is
`viewportGap / scale` too far down the page**. The correction therefore belongs
where the position is read: the stored offset is the true one, it restores
exactly at any zoom (a restore-side correction would be off by
`gap/s₁ − gap/s₂` at a different width), and #22's go-to — which scrolls to
coordinates from the page's text, not from the metrics — was already right.
Decided with the user.

## 5. The first scroll is the reader's, not the user's

`setLayoutReady` scrolls to the stored offset (initially the top) before it
emits `onLayoutReady`, and `onScroll` reports that. A save wired to `onScroll`
from mount would record page 1 on every open and overwrite the real position
before the restore ran. **Saving starts only after the restore.**

## 6. Sync and an open reader

The design system's editing rule (`research/ui-ux/design-system.md`): a surface
in active use does not adopt incoming updates to what it is using. Nothing
states it for scrolling, but a reader moved by another device mid-sentence is
the case it exists to prevent. **Decided with the user: apply on open only.**
