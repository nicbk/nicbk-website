# Status: Reader Text Tools

**State:** In progress. Sixth of six — added 2026-08-16, and now the feature's
last task.

- Branch: `article-detail-and-reader/reader-text-tools`, from `main` at
  `ec6d6e1` (task 5's merge).
- Sub-issue: [**#105**](https://github.com/nicbk/nicbk-website/issues/105),
  filed 2026-08-16 when the task was.
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close the feature's parent issue #95 by hand.** GitHub does not
  close a parent when its sub-issues close. This duty moved here from task 5
  when this task became the last.

## Why this task exists

Decided with the user on 2026-08-16, out of using task 4's reader: copy
selected text, text associated with marks (comments), and a translucent
rectangle were asked for together, and folding them into task 4 would have
grown a diff that was already about a new synced table. The capability list is
decided; the UI is not.

## Open items, as settled (with the user, 2026-08-17)

All three were settled together, because the API re-verification answered the
third outright and turned the first into a different question than it was filed
as. The UI decisions are recorded in
[reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
revision of the same date; what follows is why.

- **Capture at creation was already happening.** EmbedPDF's default text-markup
  handler writes the selected text into the annotation's `custom.text` at
  creation, and `toPayload` copies every field it does not explicitly exclude —
  so the quote has been arriving in the row since task 4. Confirmed in the dev
  database, not inferred: the one stored highlight carries
  `payload->'custom'->>'text'` with the passage it was drawn over, while its
  `contents` is null. Nothing needs to be captured; something needed to be
  *read*.
- **Two fields, comment preferred.** `contents` is the reader's own words —
  already its meaning for a text box and a sticky note — and `custom.text` is
  the paper's. The list prefers the comment, falls back to the quote, then to
  the tool's name. The alternative, promoting the quote into `contents` as the
  spec originally said, would make a highlight's `contents` mean the opposite of
  a text box's and would destroy the quote the moment a reader commented on it.
- **The comment editor is a popover from the mark's own floating menu**, beside
  delete, on the reasoning that already put delete there. The sidebar was
  declined as a second editor: it is where the text is read.
- **Copy is a floating control over the selection *and* ⌘C**, with both failure
  paths visible.
- **"highlight box", in the *draw* group.**

## What the API re-verification found

Against the installed **2.15.0**, not from recall. Three things change the
build:

- **`copyToClipboard()` does not copy.** It emits an event; the component that
  actually writes the clipboard is a `CopyToClipboard` utility auto-mounted only
  by the package's `/react` entry, and `reader-plugins.ts` registers the bare
  package. So the call would have been a silent no-op. This reader listens to
  `onCopyToClipboard` itself, which is also what makes the failure paths
  reportable — the library's own utility calls `navigator.clipboard.writeText`
  with no `catch`.
- **The plugin declines to copy from a permission-restricted PDF**, silently and
  before emitting anything. That is a state the UI has to be able to show.
- **`squareHandlerFactory` is not exported**, and a *new* tool id in the plugin
  config is added as-is rather than inheriting from a built-in — so "highlight
  box" cannot be declared in `reader-plugins.ts` beside the others. It is cloned
  from the resolved `square` tool at runtime, which reuses the engine's own
  drag-to-create handler instead of reimplementing it. Its own identity rides on
  `intent`, exactly as the engine's own `inkHighlighter` distinguishes itself
  from `ink`; `intent` and `blendMode` are base annotation fields and already
  survive the payload round-trip.

## Browser verification

Recorded here because both Playwright tiers are suspended. Exercised against the
Compose app with the 15-page Transformer paper and marks of six types.

**Confirmed**

- **Copy writes the clipboard, with the right words.** The floating control
  appears over a selection; pressing it wrote exactly the selected line
  (verified by instrumenting `navigator.clipboard.writeText` and reading back
  what it received, not by trusting the button). The label changes to "copied"
  and returns to "copy" ~1.6s later — timed by polling, because a screenshot
  round trip is slower than the confirmation.
- **⌘C copies the same thing**, with no control pressed: selecting the title and
  pressing it wrote "Attention Is All You Need".
- **A note reaches the row, and the row reaches the list.** Writing on the
  page-1 ellipse grew its sidebar row from the muted "ellipse" label to the
  note's own words, live and with no reload; it survived a reload; and the
  editor reopened carrying it.
- **One write for 49 keystrokes.** Sampling `updated_at` on the mark being
  edited, continuously, across a whole typed sentence: **two** distinct values
  over the sampling window — the one before, and one after the pause. The
  write-per-keystroke storm this task was told to design against does not
  happen.
- **A remote edit lands live.** Changing `contents` directly in Postgres — which
  is what any other client's write looks like arriving — rewrote the sidebar row
  within a second, with the page untouched. The note round-trips in both
  directions.
- **The highlight box leaves the paper readable.** Drawn over the red permission
  notice on page 1, every word is legible through the fill; after a reload it
  redraws translucent, because `blendMode` and `intent` ride the payload.
- **The two square-shaped tools are told apart**: the sidebar lists "highlight
  box" and "rectangle" as separate kinds, from the same stored `square` type.
- **A row holding both texts reads correctly** — the comment in the text
  colour, the passage quoted and muted beneath it, each clamped to two lines.
- **Both themes**, in the rail and in the drawer sheet, at **420px** and
  **1200–1440px**.

## The defect the browser pass caught

**A highlight box drew perfectly and was never stored.** Nothing on screen or in
the console said so: the mark appeared, the sidebar gained no row, and a reload
left a blank page. The control — a plain rectangle drawn immediately after —
persisted, which is what ruled out sync and pointed at the tool.

The cause was one default of mine: `strokeColor: 'transparent'`. A shape's
*interior* may be transparent — the engine has an explicit branch that clears it
— but its **stroke has no such branch**, and the value goes straight to a hex
parser that throws on anything else. The throw happens inside the commit task,
where it is swallowed: the commit fails, no `committed` event is emitted, and
the sync bridge is never told a mark was created. The fix is a real colour at
zero width, which looks identical and parses.

The regression test asserts it through **the engine's own `webColorToPdfColor`**
rather than a hex pattern of this project's devising, so what is pinned is the
real rule rather than an approximation of it. The general lesson, which is why
this is written up rather than just fixed: **a value the engine accepts in one
slot is not thereby valid in another**, and a library that fails inside an async
task can fail completely silently — "it drew" is not evidence that it saved.

## Log

- 2026-08-16 — Filed: folder, this spec at the depth decided so far, and
  sub-issue #105 under #95. Written during task 5's branch (docs only), so the
  parent issue visibly counts six sub-issues before task 5 merges.
- 2026-08-17 — Started, after task 5 merged and its tip was verified against
  `main`. Open items settled with the user (above) on the back of an API
  re-verification that corrected a task 5 finding: the engine *does* capture the
  selected text, into `custom.text`. Both status docs that recorded the wrong
  half now carry the correction — the lesson being that "the column is empty"
  was read as "nothing captured it", and one look at the whole record separated
  them. `reader-annotation.md` revised with the four UI decisions, and this
  task's `constraints-and-behavior.md` amended where the research changed a
  criterion.
- 2026-08-17 — Implemented and browser-verified (above). One defect found and
  fixed: a highlight box that drew and was never saved, from a stroke colour the
  engine cannot parse. Two things were reused rather than rebuilt, both of which
  shrank the diff: the sidebar's list needed **no new query and no new state** —
  it reads a payload field that was already arriving — and the note's editor is
  the notes tab's own hook, generalized from `use-article-notes.ts` to
  `use-synced-text.ts` (same behaviour, one caller renamed) rather than a second
  copy of the debounce-and-don't-clobber rule. No migration and no new mutator
  were needed, as `description.md` predicted.
