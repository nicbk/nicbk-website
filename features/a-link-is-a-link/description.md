# Feature: A Link Is a Link

**#22** in [../index.md](../index.md). A paper's links behave like marks, and
cannot be followed.

## What it is

Every PDF this reader opens brings its own link annotations: citations, URLs,
"Table 1", "Section 5.3". Today the reader treats each one as an editable mark.
Reproduced on the local stack, 2026-09-14, in *Attention Is All You Need*:

```
click     the citation [13], page 2 — hit-tested to the link's own rect
result    the link is selected: resize handles cover "[13]"
menu      write a note · delete annotation
page      unchanged — nothing is followed
```

**None of that is saved.** The annotation sync already ignores the file's own
annotations (`writeForEvent`: "an update to something never stored is an edit of
the file's own furniture"), so a moved, noted or deleted link is back on reload.
The reader offers edits it then silently discards.

## The cause

EmbedPDF 2.15.0 loads a document's native annotations into the same store as the
reader's marks, and its built-in link renderer declares links draggable and
resizable and selects them on pointer-down. The reader sets no lock. The library
has the mechanism — a category lock, under which a link is non-interactive and
renders a click target instead — and a registered renderer replaces the built-in
one by id, so the reader can decide what that click does.

## What it delivers

- **Links are fixed.** Not selectable, movable, resizable, notable or deletable.
- **A URL copies.** Clicking one copies the address, with a brief confirmation.
- **An internal link previews in place.** A popover shows a rendered crop of
  what the link points at — the reference entry, the table, the section — with a
  "go to p. N" button. The reader does not scroll away from where it was.
- **A numbered citation finds its own entry** even when the file points a few
  entries off, which publisher PDFs do.

## What it does not do

- **Does not change marks.** Everything a reader makes stays editable exactly as
  now.
- **Does not make the file's own highlights editable or read-only.** Raised with
  the user, who is "just concerned about hyperlinks and citations". Making them
  genuinely editable is its own design (the file is never rewritten, so a
  deletion would need a suppression record) — a possible later item.
- **Does not open the cited article in the tracker.** That half of the report
  needs the citation data **#10** builds.
- **Does not open URLs.** Decided: copy.

## Exit state

Clicking anything a paper links shows or copies what it points to, and nothing a
reader clicks in a paper can be changed unless the reader made it.
