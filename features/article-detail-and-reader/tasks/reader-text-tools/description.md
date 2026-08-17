# Task: Reader Text Tools

**Sixth of six** — added 2026-08-16 from using the reader, not at spec time.
The reader's words, given a place in the marks.

Task 4 built marks and task 5 lists them, but everything a mark carries today
came from the engine: geometry, colour, a type. The reader's own contribution —
the text they selected, the thing they wanted to say about it — goes nowhere.
This task closes that, as one coherent slice, scoped out of task 4 with the
user because that diff was already about a new synced table.

## What it does

- **Copy selected text.** The one thing a text selection is for that the reader
  cannot do today. EmbedPDF's selection plugin knows the selected string; no
  affordance exposes it.
- **Associate text with a mark** — a comment on a highlight, or on any other
  mark. This writes the `contents` column that has existed since task 4's
  migration for exactly this purpose, and it is what turns the sidebar's
  fallback rows into real snippets: task 5 confirmed the engine never captures
  the selected text, so every text-markup row today shows only its type name.
- **A translucent rectangle** — a box the paper stays readable through, for
  marking a region *and* saying something about it, using the association
  above.

## What it does not do

- **No new table and no new mutators expected.** `contents` is a column and
  `annotations.update` already writes it; if implementation finds otherwise,
  that is a finding to raise, not a migration to slip in.
- **No comment threads, replies, or PDF reply-annotations.** One mark, one text.
- **No colour picker.** Still deferred, as task 4 decided; the translucent
  rectangle is a distinct tool, not a colour option on the opaque one.
- **Nothing for #10 or #11** — the Citations tab and article editing stay where
  the roadmap put them.

## Exit state

A reader can copy what they selected, write on what they marked, and read the
paper through a box they drew — and the sidebar's rows quote the marks instead
of naming their shapes.
