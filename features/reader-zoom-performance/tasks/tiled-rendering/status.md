# Status: Tiled Rendering

**State:** **In review** — implemented, browser-verified, and
[PR #123](https://github.com/nicbk/nicbk-website/pull/123) is open with CI green.

Issue [**#121**](https://github.com/nicbk/nicbk-website/issues/121), sub-issue of
[#120](https://github.com/nicbk/nicbk-website/issues/120). Branch
`reader-zoom-performance/tiled-rendering` from `main` at `33f80c4`.

| Gate | State |
|---|---|
| Implementation | Done |
| Unit tests | Green (ratchet 92.93% vs 92.88% on `main`) |
| CI | Green ([PR #123](https://github.com/nicbk/nicbk-website/pull/123)) |
| Browser verification | Done — see below |
| Human review | Waiting |

## Baseline to beat

Taken on 2026-08-23 against `main` at `33f80c4`, Chrome, `devicePixelRatio` 2,
window 500 × 717, *Attention Is All You Need* (15 pages) — the conditions matter,
so the after-numbers are taken the same way:

| zoom | pages mounted | each bitmap | decoded total |
|---|---|---|---|
| fit width (74%) | 6 | 909 × 1177 | ~26 MB |
| 400% | 5 | 4896 × 6336 | ~620 MB |
| 480% | 5 | 5875 × 7603 | ~675 MB |

400% → 480%, one `+` click: **3825 ms** to the first re-rendered page.

## What it came to, measured

Same conditions as the baseline — Chrome, `dpr` 2, window 500 × 717, the same
paper — with the app rebuilt from this branch:

| | before | after |
|---|---|---|
| fit width (74%), fresh | 26 MB | **55 MB** (47 base + 9 tiles) |
| 400%, at rest | 620 MB | **62 MB** (39 base + 23 tiles) |
| 480%, after one zoom step | 675 MB | **71 MB** |
| a zoom step at 400% | 3825 ms | **193 ms** |
| scrolling around at 480% | not survivable | 145–221 MB, bounded |

**Ten times cheaper where it was fatal, twenty times faster per zoom step, and
about twice as expensive at fit width.** That last figure is the honest cost and
it is deliberate: the base layer is pinned at scale 1 and `devicePixelRatio` 2,
which is *sharper* than the 74% image it replaces — 1224 × 1584 per page, spent
on every mounted page whether or not it is on screen. Halving it is one
character away (`dpr={1}` on the base), and the reason not to is below.

Two things worth knowing about the shape of the "after" column:

- **Tiles linger on pages that scrolled away.** Coming back to fit width from a
  480% excursion leaves 1536² tiles on mounted-but-not-visible pages: 128 MB
  where a freshly-loaded reader holds 55 MB. It is bounded — the count settles
  and does not climb — and it is the plugin's own cache, not something this
  reader keeps.
- **The peak is while scrolling at high zoom**, not at rest: 221 MB seen, then
  back to ~150 MB. `main` at the same magnification held 675 MB *at rest* with
  six pages mounted, and would have held over a gigabyte after the same
  scrolling.

## Open items, as settled

- **The base layer is pinned at scale 1**, with the default device pixel ratio.
  The alternative — half that — was measured at ~14 MB instead of ~50 MB across
  the mounted pages, and was not taken: the base is what the magnifier draws
  from, and softening the lens to save memory the reader is no longer short of
  would trade a shipped feature for a number.
- **The magnifier does not need a sharper source.** Checked at 480% with a real
  hold and a handle drag: the lens is legible and its geometry is right, because
  it derives density from the element rather than assuming one. At the zoom
  levels touch selection is actually used, the base is *sharper* than what it
  read before this change.
- **`tileSize` 768 and `overlapPx` 2.5** — the library's defaults, kept. No seams
  were visible at any zoom tried, and a 768px tile covers a phone-sized viewport
  in one or two pieces.

## Browser verification

Against the Compose app (rebuilt with `--renew-anon-volumes`, since the dev
container keeps the image's own `node_modules` and a new dependency does not
otherwise reach it), 15-page *Attention Is All You Need*, both themes, 500px and
1400px.

**Confirmed**

- **The numbers above**, taken by counting page images and their natural
  dimensions the same way the baseline was.
- **Sharp at 480%** — text, and the marks over it, indistinguishable from
  `main`'s at the same zoom. No seams, no persistent blank regions; the blanks
  seen while panning were the page's own margins, confirmed by scrolling back
  into the text.
- **A press still lands on the paper.** `elementFromPoint` at three places on a
  480% page returns the base image carrying `data-paper` — the tiles are
  transparent to pointers, so `blank-paper.ts` still has exactly one element to
  recognise.
- **Click-away, end to end**: rectangle tool live, a mark drawn (7 → 8 rows),
  click away — the mark deselects, the row count stays 8, and moving the mouse
  afterwards sizes nothing. #114 and #118 intact.
- **Text selection at 480%** — a mouse drag selects, and the copy control appears
  over it.
- **Touch selection at 480%** — a synthetic 500 ms hold selects the word under
  the finger and grows both handles; dragging the end handle raises the
  magnifier, which draws the enlarged text and the selection tint correctly.
- **Both themes and both widths**, with the sidebar, toolbar and page navigation
  unchanged.
- **Console clean.** The one error present is a hydration mismatch caused by
  toggling the theme immediately before a reload — mine, not the reader's.
- The test mark was deleted **by the id recorded when it was made**; the article
  is back to the 7 rows it started with.

## What is not verified, and is owed

- **A phone.** The symptom that made this feature — an iOS tab reloading — cannot
  be reproduced or disproved from a desktop. What can be said is that the
  quantity behind it fell by an order of magnitude at the magnification where it
  happened.

## Notes

- **Registration order is a contract**, not a style: the plugin declares render,
  scroll and viewport as dependencies, and the reader's existing eight are
  ordered for the same reason.
- **The click-away behaviour is the thing this task can break silently.** Two
  image layers, one attribute; `blank-paper.ts` is what #114 and #118 rest on.

## Log

- 2026-08-23 — Spec'd and filed, after measuring the cause in the running reader.
- 2026-08-23 — Implemented and browser-verified. The design held; the one thing
  the browser changed was confidence about the base layer, which was an open
  question and is now a measured decision. Two things worth carrying forward:
  a new dependency does **not** reach the dev container without
  `--renew-anon-volumes` (its `node_modules` is an anonymous volume, kept across
  a rebuild), and the reader's own tab must be **focused**, not merely open, or
  Zero does not sync and the page sits at "Loading…" looking broken.
