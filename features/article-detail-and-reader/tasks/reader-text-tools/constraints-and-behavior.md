# Constraints and Behavior: Reader Text Tools

This task was added after the feature's acceptance criteria were written, so
its criteria live here rather than as a subset of
[the feature's](../../constraints-and-behavior.md). The capability list below
was decided with the user (2026-08-16); the UI shapes were settled with the user
on 2026-08-17 and are recorded in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
revision of that date. Where research changed a criterion below, the change is
marked.

## Copy selected text

- A reader who has selected text in the document can copy it, by a control that
  floats over the selection **and** by ⌘C/Ctrl+C. Both are required: the
  selection is drawn as overlay rectangles rather than as a browser text
  selection, so the shortcut copies nothing unless the page arranges it.
- Copying does not disturb the selection, the active tool, or any selected
  mark.
- **A copy that cannot happen says so.** A PDF may withhold permission to
  extract its text and the clipboard write may be refused; neither may present
  as a button that does nothing.

## Text on a mark

- A mark can carry the reader's own text, stored in the annotation row's
  existing `contents` column and synced like any other annotation change.
- The text is editable and removable after the fact, from the mark itself in
  the reader — a popover from the floating menu that already carries delete.
- **Changed by research (2026-08-17).** This criterion originally said a
  text-markup annotation captures the text it was drawn over *into `contents`*.
  The engine already captures that text, into the annotation's `custom` data,
  and it was already reaching the row through `payload`. So `contents` is the
  reader's **comment** — the meaning it already carries for a text box — and the
  captured passage stays where the engine puts it. Nothing is written into
  `contents` at creation.
- Task 5's sidebar therefore does change, in one place: a row shows the comment
  if there is one, else the captured passage, else the tool's name as its
  2026-08-16 fallback decided.

## Translucent rectangle

- A rectangle tool whose fill leaves the paper readable through it, distinct
  from the opaque-stroke rectangle task 4 shipped.
- It can carry text like any other mark.
- **Settled:** it is called **"highlight box"** and sits in the *draw* group,
  next to "rectangle". Not in *text*, which is defined as the tools that attach
  to selected text.
- A mark it makes is recognisably its own after a reload — the sidebar must not
  call it "rectangle", and selecting it must not offer the opaque tool's
  behaviour.

## Explicitly not in this task

- No comment threads or replies. One mark, one text.
- No colour picker.
- No new tables; no new mutators unless implementation proves one necessary,
  which is a finding to raise first.

## Cross-cutting

- WCAG 2.2 AA: whatever surface edits a mark's text is fully keyboard
  operable, labelled, and correct in both themes.
- Correct at narrow, mid, and wide widths.
- Only committed annotation changes are persisted, exactly as task 4's bridge
  already enforces — a keystroke-per-row write storm through the sync engine is
  the failure mode to design against.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
