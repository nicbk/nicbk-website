# Constraints and Behavior: Reader Zoom Performance

Acceptance criteria for #14. Its one task's file names the subset it satisfies —
which here is all of them, since the feature is one task.

## What must become true

- **Memory stops tracking the square of the zoom.** At 400% the reader holds a
  small multiple of what it holds at fit width, not twenty times it. The
  measured baseline to beat, taken on 2026-08-23 in a 500px-wide window at
  `devicePixelRatio` 2: **26 MB of decoded image at fit width, 620 MB at 400%**.
- **A zoom step stays responsive.** The same measurement recorded **3.8 s** from
  a `+` click at 400% to the first re-rendered page. What replaces it must be
  fast enough that the control feels like it acted, and the number must be
  recorded rather than described.
- **Panning at high zoom is smooth**, on a desktop, at 400% — the specific
  complaint. Newly exposed area may arrive progressively; what it may not do is
  stall the interface while it does.
- **A phone survives its own zoom range.** Zooming to the top of the range on
  iOS Safari does not reload the tab or raise "the page encountered an issue".

## What must not change

- **The zoom range and its controls.** `fit width`, `fit page`, 50–400% presets,
  `+`/`−`, and the gesture zoom feature #12 mounted all keep working and keep
  reading from the same single zoom state.
- **What a page looks like at rest.** At any given zoom the paper must be at
  least as sharp as it is today once rendering settles. A cheaper reader that is
  visibly blurrier has traded the wrong thing.
- **Every layer over the paper.** Text selection, the marks, the annotation and
  selection menus, the touch selection's handles and its magnifier all keep
  working — they position against the page box, and the page box does not move.
- **What "the bare paper" means.** `blank-paper.ts` recognises a click on the
  page image by an attribute; the click that deselects a mark depends on it
  (feature #12, tasks 3 and 6). Whatever renders the paper must keep answering
  that question the same way.
- **The magnifier keeps something sharp to magnify.** It draws from the page's
  own image element (`touch-selection/magnifier.tsx`), so a change to what that
  element is, or what resolution it holds, is a change to the lens. If the lens
  gets softer, that is a finding to raise — not a cost to absorb silently.

## Cross-cutting

- **No new stored data, no schema change, no new route.**
- **Self-hosted, like everything else.** Any new package's assets are bundled
  through Vite, never fetched from a CDN — the decided CSP is `default-src
  'self'` (`research/security-privacy/app-security-headers.md`), which is why
  the pdfium wasm is imported rather than linked.
- Correct in both themes and at narrow, mid and wide widths.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
- **Browser verification is primary evidence, with numbers.** This feature's
  whole subject is a quantity, so "it feels faster" is not a result: the same
  measurements that produced the baseline above are re-run and recorded.
