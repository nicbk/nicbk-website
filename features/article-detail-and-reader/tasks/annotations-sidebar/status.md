# Status: Annotations Sidebar

**State:** **Merged** (2026-08-17). Fifth of six — no longer the feature's last:
[`reader-text-tools`](../reader-text-tools/status.md) (#105) was added after
this task was spec'd, and the close-#95-by-hand duty moved there with it.

- Branch: `article-detail-and-reader/annotations-sidebar`, from `main` at
  `3b48d0b` (task 4's merge).
- Sub-issue: [**#100**](https://github.com/nicbk/nicbk-website/issues/100),
  self-assigned before work began.
- PR: [**#106**](https://github.com/nicbk/nicbk-website/pull/106), CI green,
  merged 2026-08-17. Tip verified against `main` afterwards (empty diff over
  `src/`, `features/`, `research/`) — the glyph-tab commit went up minutes
  before the merge click, which is exactly the case that check exists for.

## Open items, as settled (with the user, 2026-08-16)

- **A textless row shows the tool's own name** — "freehand", "rectangle",
  "ellipse", the same words `annotation-tools.ts` puts in the toolbar's menu —
  styled muted so it reads as a label rather than as content. One vocabulary
  across the toolbar and the list, and the page number sits in its own slot on
  every row either way.
- **The jump crosses from the rail to the reader through a context mounted at
  the route layout** (`route.tsx`). The sidebar renders in the shell's rail,
  which is a *sibling* of the page, so no callback prop can span the two; the
  layout is the only level that sees both, and it is the same level #10's
  tab-swap state will need — so this leaves the Citations tab easier, as the
  spec asks. The reader registers its scroll handle on mount; the panel calls
  it; with no reader mounted the call is a no-op.
- **Ordering was already decided in the query.** `annotations.forArticle`
  sorts by `page_index` then `created_at`, and its own comment says it does so
  for this sidebar. The list reuses that query as-is — the same subscription
  the reader's sync bridge holds, so the list costs no new round trip.

## The finding that widened an assumption

**Highlights are textless too.** The spec framed empty `contents` as the ink-
and-shapes case, but EmbedPDF never captures the selected text *into `contents`*
— confirmed against the dev database (every text-markup row's `contents` empty).
So the fallback is the common case
for now, not the edge: only the two "write" tools put words in a row. Accepted
for this task with the user; **task 6's text-association is what fills the
snippets**, and this list needs no change when it does — rows with `contents`
already show it.

*Corrected in task 6, and the correction is worth reading:* the parenthesis
above originally also claimed the payload carried "only rects and colours". It
does not. The engine's default text-markup handler writes the selected text to
`custom.text` at creation, and `toPayload` carries it through, so a highlight's
quote was in this article's rows the whole time — the list showed a type name
because it reads `contents`, not because nothing was captured. The lesson is
about the check, not the library: "the column is empty" was read as "the value
was never captured", and one `select payload->'custom'` would have separated
them. When a field is missing, look at the whole record before concluding
nothing produced it.

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against
the Compose app with a real 15-page paper and marks of five types across three
pages.

**Confirmed**

- **The list is live in all three directions**: a rectangle, an ink stroke, a
  highlight, an ellipse and a text box each grew a row the moment they were
  drawn, with the tab open; deleting the page-1 rectangle removed its row; and
  editing the text box's words rewrote its snippet — all without a refresh.
- **Rows sort by page with creation-time ties**: the ink row inserted itself
  between the page-1 and page-15 rectangles, and the page-8 trio held creation
  order.
- **Jump lands on the row's page and the indicator agrees**: page 8 → 1 and
  1 → 15 by click, and by keyboard (Tab to the row, Enter) — noting Base UI
  makes the panel itself a tab stop, so the row is two Tabs from the strip.
- **The fallback rows read as labels**: "freehand", "highlight", "rectangle",
  "ellipse" in muted italic; the text box's row quotes its words, whitespace
  collapsed, clamped to two lines with an ellipsis.
- **The multi-window check — including the one task 4 still owed.** A genuine
  second window (popup, both documents `visible`): an ellipse drawn in window
  A was in window B's list within ~2s, drawn on B's paper, and B's own row
  click moved B's reader to its page. Cross-window sync works end to end.
- **No writes while idle**: `max(updated_at)` over all rows unchanged across
  15 seconds with the list mounted — the second subscription added no echo.
- **Both themes** (rail and drawer), **420px** (list inside the drawer sheet,
  jump visibly moves the reader behind the open sheet — the sheet covers the
  lower half only, so tapping through rows shows each jump, which is why it
  deliberately stays open) and **1114px**.
- **Empty state**: an article with no marks says "no marks on this paper
  yet.", only after the first round trip completes.

## Defect found in the browser

**The tab strip could not wrap, and "annotations" clipped to "annot".** The
strip was a column-flow grid whose own comment promised wrapping — invisible
for two tasks because "tags notes" fit one line, and caught the moment a long
tab name arrived. No wording rescues a single line (the rail gives the strip
~143px; the three words need ~216px), and #10's "citations" is longer still.

The first remedy — a wrapping flex row — fixed the clipping but **read as
ragged: two tabs on one line and "annotations" alone on a second
(user-reported)**. The design is now **a word or a glyph, one row always**:
a container query on the sidebar trades every tab's word for its Lucide glyph
below 20rem, keeping the word as the accessible name and the pointer tooltip
(`title`). The rail always shows glyphs, the drawer sheet always shows words,
and the threshold is sized for the decided four tabs so #10 renders into it
rather than moving it. This is the same trade the reader's toolbar triggers
already make at their narrow breakpoint, and a container rather than a media
query for the same reason the tag controls use one: the component renders at
two very different widths on a single viewport. `flex-wrap` stays only as the
failure mode of last resort, clipping being the worse one.

## Log

- 2026-08-16 — Started, immediately after task 4 merged. Open items settled
  with the user (above), task 6 filed as #105 on this branch so the parent
  issue counts six sub-issues, and the stale merge state in the feature docs
  brought current.
- 2026-08-17 — Implemented and browser-verified (above). One defect found and
  fixed (the strip that could not wrap). Task 4's owed multi-window check
  passed here, as its status.md predicted it would.
- 2026-08-17 — **The wrapped strip superseded, with the user**: glyph tabs
  with tooltips in the rail, words in the sheet, one row at every width (see
  the defect section). Re-verified in both themes, in the rail and the
  drawer sheet.
