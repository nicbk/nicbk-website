# Research: Reader Marking a Passage

Traceability back into `research/*.md`, plus the measurements this feature was
spec'd from. Everything below was measured or read on **2026-09-11**, against
the code on `main` at `a8dbd4e` and the installed **EmbedPDF 2.15.0**.

## Decided research this builds on

- [reader-annotation.md](../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)
  — the reader's annotation model: the twelve tools and their three groups, the
  sticky tool, the mark's floating menu carrying delete and the comment editor,
  and **the copy control floating over the selection**. Its stated reason for
  both menus is the one this feature extends: *a control that acts on this mark
  belongs beside it, not in a toolbar that stays identical whatever is
  selected*. Its **2026-08-22** revision decided the touch model — long press
  selects a word, handles extend it — and did not say how a touch reader marks
  one.
- [pdf-reader-annotations.md](../../research/technologies/pdf-reader-annotations.md)
  — why EmbedPDF, headless. The decision that the prebuilt UI was passed over
  because of how it felt is what makes "compose it ourselves from the public
  API" the ordinary move here rather than an exception.
- [pdf-and-annotation-data-protection.md](../../research/security-privacy/pdf-and-annotation-data-protection.md)
  — unchanged: marks are rows owned by their user, written through the same
  mutators #9 built. This feature adds no new data path.

## The cause, in the library's source

**One event is not emitted, in two situations.** Everything that acts on a
finished selection listens to `SelectionPlugin`'s `endSelection$`:
the annotation plugin commits a live markup tool from `onEndSelection`
(`plugin-annotation/dist/index.js:4784`), and `endSelection` is also what clears
the plugin's own `selecting` flag (`plugin-selection/dist/index.js:1203-1207`).

1. **A programmatic selection never emits it.** `applySelection` — what the
   public `setSelection` capability calls — does everything its sibling
   `applyInstantSelection` does (dispatch, rects, `selChange$`, notify pages,
   menu placement) **except** emit `beginSelection$`/`endSelection$`. Compare
   `:1240-1286` with `:1367-1385`. The sibling is the double-click and
   triple-click path, which is why double-clicking a word with a tool live
   *does* mark it and a long press on the same word cannot.
2. **A drag released over another page never emits it.** The text handler is
   registered **per page** and keeps `dragStarted` in its own closure
   (`:503-570`); `onPointerUp` calls `onEnd` **only if `dragStarted`**, and that
   flag is set by *that page's* `onPointerMove`. Start on page 1 and release
   over page 2: page 1 holds the flag but never sees the lift, page 2 sees the
   lift with the flag false and merely resets.

**The stuck flag is the third symptom.** `recalculateMenuPlacement` returns no
placement while `docState.selecting` is true (`:1065`), so after a cross-page
drag the floating control never appears. ⌘C is unaffected because the shortcut
does not go through the menu — which is exactly why this went unnoticed.

**The flag is publicly readable**: `selection.getState(documentId).selecting`
(`plugin-selection/dist/lib/types.d.ts:66`). That is what makes a fix outside
the library possible — this reader can *tell* when the library failed to finish
a selection rather than having to guess.

## What was measured

Against the Compose app, *Attention Is All You Need* at 109%, with a page break
on screen. Marks counted in the database by article id; engine activity counted
by a temporary probe on the reader's own annotation-event subscription.

| Gesture | Marks the passage | Copy control | ⌘C |
|---|---|---|---|
| Mouse drag, one page, tool live | **yes** — one row | yes | yes |
| Mouse drag across a break, tool live | **no** — zero engine events | **no** | yes, 343 chars |
| Touch selection, then pick a tool | **no** — selection is cleared | n/a | — |

The middle row's "zero engine events" is the decisive measurement: the marks are
not created-then-lost, and this project's `annotation-sync/` is not involved in
any of it. An earlier note claiming the marks were drawn but not persisted was
wrong, and is corrected here.

## Why a touch reader cannot reach a tool at all

Two guards, each correct on its own, which together leave no path:

- **Picking a tool clears the selection.** Leaving a mode whose configuration
  enables selection calls `onHandlerActiveEnd` → `onClear`
  (`plugin-selection/dist/index.js:597-601`). Reading mode and every text tool's
  mode both enable selection, so moving between them clears what was selected.
- **A live tool takes the hold.** `use-hold-to-select.ts` returns early unless
  the live mode is `READING_MODE` — task 4's decision, so that a hold in the
  middle of drawing a shape does not also select the text under it.

So "select, then pick a tool" loses the selection, and "pick a tool, then hold"
does nothing. This is why the feature needs a way to mark that involves no mode
change at all, and it is the reason for the decision below.

## Decisions taken with the user, 2026-09-11

- **The fix lives in this reader, on the public API** — not in a patched
  dependency. Weighed against a two-line patch to `plugin-selection` (emit
  begin/end from `applySelection`; end on pointer-up when the *document* is
  selecting rather than when this page's drag started), which is smaller and
  keeps the library the single implementation of markup. Declined because this
  repository has no patch machinery at all today, a patched dependency is a
  standing cost on every upgrade — including the eventual 3.0, where the code
  has moved — and extending EmbedPDF through its public API is what this reader
  already does elsewhere (`use-highlight-box-tool.ts` adds a thirteenth tool
  that way). The cost accepted is about twenty lines that duplicate
  `textMarkupSelectionHandler`, bounded by the four text tools this reader
  offers, all of which share that one default handler.
- **Marking happens on the selection's own floating control**, which gains the
  text tools beside `copy`. No mode change, so nothing clears the selection, and
  one route serves mouse and touch alike. This extends the pattern
  `reader-annotation.md` decided twice rather than inventing one. The cost
  accepted is that a mouse gains a second way to mark beside the toolbar tool —
  which that document calls "normally one too many", and which is worth it here
  because the alternative is a gesture that silently does nothing.
- **Upstreaming is not part of this feature.** The defect is worth reporting to
  `embedpdf/embed-pdf-viewer` (MIT), and doing so is a separate decision to take
  with the user, since it publishes to someone else's repository.

## Versions

`@embedpdf/plugin-selection@2.15.0` is the latest **stable** release; the
registry's newer entries are `3.0.0-next.*` pre-releases whose package layout is
restructured (a `contract`/`internal` split) — a major upgrade, not a fix to
adopt. So "upgrade the dependency" was never an available remedy.
