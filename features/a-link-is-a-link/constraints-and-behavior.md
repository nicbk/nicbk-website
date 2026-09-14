# Constraints and Behavior: A Link Is a Link

## Behavior

| a reader clicks | result |
|---|---|
| an external URL | copied; a confirmation toast says so |
| a `mailto:` link | the address (without `mailto:`) copied; same toast |
| an internal link | a popover over the reader shows a rendered crop of the target region and "go to p. N"; the reader does not scroll |
| "go to p. N" in the popover | the reader scrolls to the target; the popover closes |
| a link with no usable target | nothing |
| a mark | exactly as today |

Links are never selected, dragged, resized, given a note or deleted.

## Constraints

### Lock links only

The lock must not reach marks. The default `link` tool shares its categories with
the markup tools, so it gets its own category and the lock names only that. Marks
and the file's own highlights keep today's behaviour.

### The reader owns the link's click

A registered `link` renderer replaces the built-in one. The built-in locked mode
scrolls on an internal link, which was decided against.

### Text selection over a link still works

A locked link is a pointer target over words. Starting or ending a text selection
on a citation, and highlighting a sentence containing one, must behave as they do
on plain text.

### Where a link points is a pure function

From the link, its target and the relevant pages' text runs to a region
(page, rect) or "none". No engine, no DOM. Rules, in order:

1. **No destination** (URI, unsupported, remote file) → none.
2. **Numbered citation snap.** Link text is `N` or `[N]` (1–3 digits), and a run
   on the target page or one either side *starts* with `[N]` or `N.` → that run's
   line is the top. The nearest such page to the target wins.
3. Otherwise the **exact target**: XYZ `(x, y)`, or FitRectangle's `view` top.
   Neither → the page's top.
4. **Column**: from the text lines at the top — the extent of the runs on that
   line that start at or right of the top's x — never from halves of the page.
5. **Height**: to the next link target below the top in the same column on the
   same page; failing that, a bounded fallback.
6. **Clamp** to the page.

### A crop, not text

The popover renders the region with the reader's render plugin. It does not
extract, reflow or copy text.

### Test data is synthetic

Fixtures are text runs *shaped like* the measured papers — positions, labels,
column widths — not text extracted from them. No paper's content goes into the
repository.

## Acceptance criteria

1. Clicking a link never selects it; no handles; no selection menu.
2. A URL click copies the address and shows a confirmation; a `mailto:` copies
   the address alone.
3. A mark can still be selected, edited and deleted; a sentence containing a
   citation can still be highlighted, starting or ending the drag on the
   citation.
4. The resolver's unit tests cover: exact XYZ target; two-column target bounded
   to its column; FitRectangle target off by entries, snapped; numbered link with
   no matching label, unsnapped; last entry on a page (fallback height);
   non-citation target; no destination.
5. Clicking a citation in each measured paper previews that citation's own
   entry, in Chrome and Safari; a table link previews the table.
6. The popover is reachable and dismissible by pointer, touch and keyboard, and
   fits a 375px viewport.
