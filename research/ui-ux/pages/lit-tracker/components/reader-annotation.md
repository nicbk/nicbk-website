# Reader + Annotation UI

Status: Decided 2026-07-04.

The default main-content view within
[article-detail.md](../pages/article-detail.md) — swapped out for the
citation graph while the sidebar's Citations tab is active, and shown again
for any other sidebar tab (see
[citation-graph.md](./citation-graph.md)). Built on EmbedPDF's headless
architecture — see
[../../../../technologies/pdf-reader-annotations.md](../../../../technologies/pdf-reader-annotations.md)
for the underlying technology decision, including the resolved research on
how EmbedPDF's annotation data model is portable/syncable independent of the
PDF binary. No mockup on file — layout worked out directly with the user.

- **Toolbar**: a persistent top toolbar (not floating/contextual), holding:
  annotation tool buttons, page navigation (prev/next plus a page-number
  indicator), and zoom controls.
- **Annotation types exposed**: the full set EmbedPDF's annotation plugin
  supports — highlight; sticky note and free text; ink (freehand); and
  underline/strikeout/squiggly text markup plus shape annotations
  (square/circle/line/polyline/polygon), the latter useful for e.g. circling
  a figure or diagram.
- **Creation flow**: tool-select then apply — the user picks a tool (e.g.
  Highlight, with a color) from the toolbar, then selects text or
  clicks/drags on the page to apply it. The tool stays active for repeated
  use until the user switches tools or deselects, rather than requiring a
  fresh toolbar pick per annotation.
- **Persistence/sync**: live reactive sync, consistent with the rest of the
  app's reactive-data approach — annotations save automatically as they're
  created/edited/deleted, using EmbedPDF's `AnnotationScope` API
  (`createAnnotation`/`updateAnnotation`/`deleteAnnotation`, subscribed to
  via `onAnnotationEvent`) to feed our own database and reactive sync engine
  (see [sync-engine.md](../../../../technologies/sync-engine.md)), keyed by
  each annotation's `id`/`pageIndex`. The PDF file itself is never rewritten
  per edit — annotations are a normal syncable record type, separate from
  the PDF binary.
- **Annotations sidebar tab**: a 4th tab in
  [article-detail.md](../pages/article-detail.md)'s sidebar, alongside
  Tags/Notes/Citations — list-only, listing this article's annotations
  (e.g. a text/content snippet and page number per row). Selecting the tab
  does **not** swap the main content area (unlike Citations): the PDF reader
  stays as main content, since annotations conceptually live inside the
  reader itself, and clicking a row jumps/scrolls the reader to that
  annotation's page.
- **Notes vs. annotations**: kept distinct from
  [article-detail.md](../pages/article-detail.md)'s separate Notes tab
  (a free-text summary field for the article as a whole) — annotations are
  anchored to a specific point in the PDF, notes are not.

## Revision (2026-08-13), decided with the user at implementation

**The toolbar overlays the document instead of sitting above it, and its groups
float rather than forming one solid bar.** The bullet above rules out a
"floating/contextual" toolbar, and the half of that which matters is kept: the
toolbar is *persistent* — always present, identical whatever the reader is doing,
never summoned by a selection or anchored to what is under the cursor. What
changed is where its pixels come from.

- **As a row of its own it cost its full height everywhere.** On the one page
  whose purpose is showing a document, a permanent strip above the paper is the
  most expensive furniture in the tracker. Absolutely positioned over the top of
  the document, it costs that height only at the very top of the scroll — the
  first page is offset to clear it, and from there on the document runs the full
  height of the panel and passes underneath.
- **The bar is transparent; the control groups are not.** Pages on the left, zoom
  on the right, the reserved annotation-tool slot between them, each an opaque
  rounded surface with the paper visible in the gaps. A solid band read as a
  second header and walled the document off from the page it sits on. This is the
  same arrangement [collection-view.md](../pages/collection-view.md)'s toolbar
  arrived at independently, for the same reason: transparent is the row, never
  the controls.
- **The page-level controls joined it** — the sidebar's narrow-screen trigger and
  the article's three-dot menu, as a third floating group at its end. They had
  been in the metadata header the same decision removed (see
  [header.md](./header.md)'s 2026-08-13 revision), and a row kept alive for two
  buttons costs more document than the separation was worth. A menu opened from
  that group dims and disables what is behind it, so the bar is not left looking
  live underneath its own popup.

The general lesson, recorded because it will recur: **"not floating" was written
about a toolbar's *behaviour* — where it appears and when — and was then read as
a statement about its *background*.** When a decided constraint turns out to
carry two readings, the one to keep is the one the reasoning was about.

## Revision (2026-08-13), decided with the user as the tools were built

**The twelve tools are one control in the bar, not twelve.** The bullet above
says the toolbar holds "annotation tool buttons", which read as a strip of them.
Twelve icon buttons is most of a narrow screen's width — the bar had already been
taken sideways once at 420px by this feature — and the usual fix for that, a
menu, may as well be the design rather than the retreat. So the reserved slot
holds a single group whose trigger **names the live tool**, opening a menu of
thirteen choices: "select" (which deselects), then the tools under three
headings — *text* for the four that attach to selected text, *draw* for the six
drawn on the page, *write* for the two that carry the reader's own words.

Two consequences worth stating, because both are requirements rather than
niceties:

- **Every tool carries a word as well as a glyph.** An icon-only control needs an
  accessible name regardless, so the name is visible to everyone instead of only
  to a screen reader — and nobody has to guess which pentagon means polygon. Below
  the narrow breakpoint the trigger drops its word for its glyph; its accessible
  name does not change.
- **The active tool is stated three ways** — named in the trigger, shown by its
  own glyph, and coloured — so the state is never carried by colour alone.

## Revision (2026-08-16), from using the reader

**The groups are one centred cluster, not four islands.** The 2026-08-13
revision put the page-level controls "as a third floating group at its end", and
with the annotation tools present that spread the bar's contents across the whole
window: at 1440px the four groups sat as far apart as the width allowed and read
as four unrelated things (user-reported). The distance between controls is now a
constant and what varies with the window is the paper on either side of them.
The distinction the earlier revision was protecting survives — the page's
controls are still their own opaque group, adjacent rather than merged — but
"at its end" is superseded: the end of a wide bar is nowhere near what it acts
on.

**A mark can be selected, and selecting it is how it is removed.** The original
decision covers making marks and lists them in the sidebar, and says nothing
about unmaking one — yet "annotations are individually deletable" is the reason
undo was ruled out. So: clicking a mark selects it and floats a small control
beside it carrying **delete**. Anchored to the mark rather than added to the
toolbar, because the toolbar is about the document and stays identical whatever
is selected; a control that acts on *this* mark belongs beside it.

**Deleting is one click, with no confirmation and no undo** (decided with the
user). The control sits just above the mark, which is also where "click away to
deselect" naturally lands, and marks were lost that way in testing — judged
acceptable anyway, because a mark takes seconds to redraw and a confirmation
would tax every deliberate deletion to protect against the occasional slip. If
this proves wrong in use, moving the control is the cheaper remedy than adding a
step.

**Putting a selection down has two ways out, and both are needed.** Clicking the
bare paper deselects the mark; **Escape** drops all three things a reader can be
holding at once — a text selection, a selected mark, and a live tool. EmbedPDF
supplies neither: its "empty space" event means *no text here*, and the
annotation plugin does not listen to it, so a selected mark stayed selected
until another was chosen.

**Colour selection is deliberately not built.** The creation-flow bullet above
mentions picking a tool "with a color" in passing; every tool draws in its
built-in colour for now (user-decided). The task carrying this was the one
introducing a new synced table, and a colour control is new UI, new state, and a
new accessibility surface with no decision behind its palette. It can be added
later against a working sync bridge; nothing here forecloses it.

## Revision (2026-08-17), decided with the user before the reader's text tools

Three capabilities were scoped out of the annotations task and asked for
together — copying selected text, saying something about a mark, and a
translucent rectangle. The capability list was decided then; the UI is decided
here.

**A reader's words and the paper's words are two different things, and the mark
holds both.** The engine already captures the text a highlight was drawn over —
it writes it to the annotation's `custom` data at creation — so the question was
never how to capture it but what to call it. `contents` is **the reader's own
comment**, which is the meaning it already carries for a text box and for a
sticky note; the captured passage stays where the engine puts it. The
annotations list then reads, in order: the comment if there is one, else the
quoted passage, else the tool's name as the 2026-08-16 fallback decided. A
reader who writes on a highlight therefore never overwrites the sentence they
highlighted, and the list stops naming shapes as soon as there is anything
better to say.

**The comment is written beside the mark, in a popover from the mark's own
floating menu.** That menu already exists and already carries delete, so the
reasoning that put it there carries the editor too: a control that acts on
*this* mark belongs beside it, not in a toolbar that stays identical whatever is
selected. The sidebar's list was considered and declined — it is where the text
is *read*, and a second editor for one field would be two mid-edit-overwrite
guards and two ways to reach one outcome.

**Copying has both a button and the platform shortcut, and it needs both.** A
small control floats over the selection, positioned by the same mechanism as the
mark's menu, because nothing otherwise tells a reader that copying is possible.
⌘C/Ctrl+C does the same thing, because it is what a reader tries first — and it
does not work by itself: the reader's selection is drawn as overlay rectangles
over a canvas, not as a browser text selection, so the platform has nothing to
copy unless the page arranges it. Two entry points to one outcome is normally
one too many; a keyboard shortcut that mirrors a visible control is the
exception, because the alternative is a gesture that silently does nothing.

**A copy that cannot happen says so.** A PDF may withhold permission to extract
its text, and the clipboard may refuse the write; both are ordinary and neither
may be a button that does nothing when pressed.

**The translucent rectangle is "highlight box", in the *draw* group.** It sits
next to "rectangle", where someone hunting for a box will look, and borrows the
word the menu already uses for the see-through mark so its relation to the
opaque rectangle needs no explaining. It is *not* in the *text* group despite
what it is for: that group is defined as the tools that attach to selected text,
and this one is drawn on the page. It stays a distinct tool rather than a colour
option on the rectangle, which is what keeps the deferred colour picker deferred.
