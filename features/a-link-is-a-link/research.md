# Research: A Link Is a Link

Measured 2026-09-14, before the spec was written.

## 1. Reproduction

Local stack, Chrome, *Attention Is All You Need*. 32 link rects in view
(`[class*="_pageLayers_"] svg > rect[fill="transparent"]`). A real click on the
citation `[13]`, hit-tested first to the link's own rect: the link selected, with
handles over the text, and the selection menu rendered with **write a note** and
**delete annotation**. The page did not change. Neither button was pressed.

## 2. Why links are editable (EmbedPDF 2.15.0)

- `onDocumentLoaded` → `getAllAnnotations` → `SET_ANNOTATIONS`, every native
  annotation `commitState: "synced"`, no subtype filtered
  (`plugin-annotation/dist/index.js` ~4712, ~5050, ~4369).
- The React link renderer: `interactionDefaults: { isDraggable: true,
  isResizable: true }`, `selectOverride` selects, `renderLocked: LinkLockedMode`
  (`react/index.js` ~3366–3417); the link's rect selects on `onPointerDown`.
- The reader registers the annotation plugin with `deactivateToolAfterCreate:
  false` only — no `locked`, no tool overrides.
- The selection menu filters only `structurallyLocked`
  (`annotation-selection-menu.tsx`).

## 3. What locking offers

- `locked: { type: LockModeType.Include, categories }` locks every annotation
  whose matched tool carries one of the categories. The default `link` tool is
  categorised `["annotation", "markup"]` — the same as the highlighter — so a
  `link` tool override with its own category is needed, or the lock would take
  marks with it.
- A non-interactive annotation: never selected, no menu, no drag or resize, and
  its renderer's `renderLocked` draws instead.
- The built-in `LinkLockedMode` is a full-size `div` whose click calls
  `navigateTarget`: a destination **scrolls** the reader; a URI only emits
  `onNavigate`. Neither is what was decided.
- **Registered renderers replace built-ins by id** (`useRegisterRenderers`;
  `[...registered, ...builtIn.filter(id not registered)]`), so the reader can
  supply its own `link` renderer and own the click.

## 4. What links point at

The reader's engine run in Node over the local papers (`PdfiumNative`,
`getPageAnnotations`, `getPageTextRuns`):

| paper | links | internal | target form |
|---|---|---|---|
| Attention (LaTeX, numbered) | 113 | 95 | XYZ, exact point |
| BERT (LaTeX, two-column, author–year) | 290 | 260 | XYZ, exact point |
| NeurIPS paper (LaTeX, author–year) | 136 | 132 | XYZ, exact point |
| PLOS ONE (publisher) | 267 | 135 | **FitRectangle, a horizontal line**, 5 links with no target |
| CV | 6 | 0 | URI and `mailto:` only |
| two papers | 0 | — | none |

Internal links are **not only citations**: "Table 1", "Fig 2", "Section 5.3" and
footnote markers are the same annotation. So the preview shows *what is at the
target*, not specifically a reference.

### Text at an exact target is the entry

`[13]` → `[13] Sepp Hochreiter and Jürgen Schmidhuber. Long short-term memory…`;
author–year targets land on the author list. On BERT's two-column page, a band
across the page interleaves the other column — so the region must be bounded to
its column.

### Publisher targets are off by entries

PLOS: `[18]` lands on entry **13**, `[39]` on **34**, `[9]` on the top of the
page. Its extracted text is also broken mid-word ("dyspla sia"), which is one
reason the preview is an image, not text.

## 5. Geometry that works on every measured paper

| rule | result |
|---|---|
| **snap a numbered citation** — link text is `N` or `[N]`, and a text run on the target page (or one either side) *starts* with `[N]` or `N.` | Attention: 60/60 found, 2 corrected. PLOS: **49/49 found, 49 corrected**. BERT and NeurIPS have no numbered citations, and nothing snapped |
| **height to the next entry** — the nearest other link target below this one in the same column | one entry per crop on Attention, BERT and NeurIPS; the last entry on a page has no next target and needs a fallback |
| **column from the lines at the target**, not from halves of the page | BERT: 223pt columns at 67 and 302. A half-page split gave PLOS's single-column references a 313pt crop of a 612pt page — wrong |
| **non-citation targets** (a table) have no next entry and no text line to size from | fallback size needed |

## 6. Decisions, with the user, 2026-09-14

1. Scope: lock + follow. The in-tracker article half stays with #10.
2. URL click copies, with a toast.
3. File-borne highlights: out of scope.
4. Internal link: preview, don't jump.
5. Preview is a rendered crop, not extracted text.
6. Imprecise targets: snap numbered citations.

## 7. Carried into the tasks as open

- **A link inside a mark** — a highlighted sentence containing `[13]`. Which gets
  the click is measured in task 3 and raised, not guessed.
- **The first confirmation toast.** The toast wrapper's comment says low priority
  is "right for the confirmations this site does not show" — this is the first.
