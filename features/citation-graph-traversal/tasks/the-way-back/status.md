# Status: The Way Back

**State:** Complete ([#205](https://github.com/nicbk/nicbk-website/issues/205);
merged in [#214](https://github.com/nicbk/nicbk-website/pull/214)).

## What shipped

- **The path rules** (`src/lit-tracker/citation-path.ts`), pure: the path a
  followed citation produces, the path a path link carries, which papers are
  known, where each step sits, and how each step is labelled.
- **`?via=`** on the article route (`-article-detail/article-search.ts`), a list
  of article UUIDs, capped, degrading to absent when malformed.
- **`articles.onPath`**: one owner-scoped query for the whole path — the papers
  and, related to each, its edges pointing at another paper on the same path.
- **`ArticlePath`** (`-article-detail/path/`) in the header's title slot,
  replacing `ArticleTitle` only when there is a path, with the "⋯" menu holding
  the whole journey.

## Decided at implementation (2026-09-15)

- **How much of the path shows is a question of width**, decided with the user
  against measurements rather than by the count alone. The title slot holds 101
  characters at 1512px, 88 at 1280, 63 at 1024, 41 at 768 and 30 at 600 (the
  row's type shrinks under 640px); paper titles here run 25–80 characters. A
  labelled trail of three needs ~66, so:
  - **from 70rem**: three papers, the middle folded past three;
  - **from 52rem**: the previous paper and this one;
  - **under that**: this one alone;
  - **under 34rem**: the hop labels go too — measured at 375px, "›cited by "
    left the open paper reading `L…`.
  The "⋯" menu always holds the whole path, so nothing is reachable only at a
  width. The rules are CSS; nothing measures at runtime.
- **Earlier papers give way first** (user-decided): they are capped at 16
  characters and the open paper keeps the rest. They are handles for going back,
  not things to read.
- **A cycle collapses** (user-raised): the revisit rule is applied to every id in
  turn, including a hand-edited `?via=`, so no paper is ever on the path twice.
  `[A, B, A, C]` arriving with `X` open replays to `A › C › X` — the visit to A
  cut B away, and C and X went on from there.
- **An empty path is no parameter**, like every other inactive parameter on this
  site: going back to the start leaves as clean a URL as it began with.

## Verified

- **Unit.** The walk (append, cut back, collapse a cycle, the cap); the steps
  (titles, both label directions, unlabelled without an edge, per-step `via`,
  roles, unknown ids dropped, no path for a paper opened alone); the search
  schema (ids only, a lone id lifted, over-long refused); the query the hook
  asks for and what it makes of the answer; the component (every step rendered
  and marked, no separator before the first, the current paper inert, the menu
  holding the whole path with the open one listed and unpressable).
- **Chrome, local**, with a fourth paper (RoBERTa) uploaded through the app so a
  four-step path exists:
  - `BERT… ›cites Attention… ›cites Layer Normalization` at 1512px, each earlier
    title capped at 153.6px and ellipsised, no overflow;
  - at 1000px the first paper folds into "⋯"; at 700px only the open paper is
    left; the menu holds all of it at every width;
  - `Layer Normalization ⋯ ›cited by BERT… ›cited by RoBERTa…` — the middle step
    folded away on a four-paper path;
  - following "⋯ → Attention" truncated `LN › Attention › BERT › RoBERTa` to
    `LN › Attention`, and so did opening Attention from RoBERTa's *cites*;
  - Back and reload both kept the path;
  - an id that is not one of this reader's papers was dropped, with no
    placeholder and no error, and the step it left adjacent was unlabelled —
    there is no edge between those two;
  - both themes.
- **Safari, 375px**: `⋯ Layer …` and the menu holding the three papers with
  their labels; one row, no horizontal overflow. The open paper's title gets
  68.1px there with no path and 53.2px with one, so the "⋯" costs about two
  characters on a row that is already down to nine.

A five-paper path was not walked: four papers are what the local collection
holds, and the fold is the same rule at four as at five.

## Log

- 2026-09-16 — #214 merged, and checked on `nicbk.com` in Safari: the path and
  its labels, a revisit cutting back, and "⋯" plus the open paper at 375px.
- 2026-09-14 — Spec'd.
- 2026-09-15 — Implemented. Measured the header before choosing a layout, after
  the user asked whether a path could be read in the navbar at all; the width
  ladder above came out of those numbers.
