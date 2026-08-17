# Status: Annotations

**State:** **Merged** — PR
[#104](https://github.com/nicbk/nicbk-website/pull/104), 2026-08-16, CI green,
tip verified in `main` (`3b48d0b`). Fourth of six.

- Branch: `article-detail-and-reader/annotations`, from `main` at `0ce1eef`
  (task 3's merge). Deleted after the merge was verified.
- Sub-issue: [**#99**](https://github.com/nicbk/nicbk-website/issues/99),
  closed by the merge.

## Open items, as settled

- **EmbedPDF's annotation API, re-verified against the installed 2.15.0** by
  reading the shipped source rather than the documentation. Everything the spec
  predicted holds: `useAnnotation(documentId)` returning `{state, provides}`,
  page-index arguments on update and delete, and a `committed` flag. Two details
  the spec could not have: the flag is on `create`/`update`/`delete` but **not on
  `loaded`** (which carries a count), and the plugin's manifest reads
  `requires: ['interaction-manager', 'selection']`, `optional: ['history',
  'scroll']` — so undo/redo stays out with no workaround, exactly as decided.
- **The `committed` flag means "written into the in-memory PDF"**, emitted from
  the plugin's `emitCommitEvents` once the engine's create/update/delete task
  resolves. With `autoCommit` on (the default) every change is followed by a
  commit a tick later. It is the right signal to persist on — but it says PDFium
  has the change, not that the server does.
- **Where the bridge lives**: `-article-detail/reader/annotation-sync/`, as three
  modules — `annotation-row.ts` (the translation, pure), `annotation-sync.ts`
  (the decisions, pure), `use-annotation-sync.ts` (the wiring, ~70 lines). The
  split is what makes the committed-only rule assertable with a fake event and a
  plain map, with no engine anywhere.
- **Import at load does not race the reader.** `importAnnotations` queues items
  until the plugin's own initial load completes — read in the source, not
  assumed. The remaining race is on the Zero side, and is closed by not acting on
  a query result until its first round trip is `complete`: an empty result before
  then is not evidence that a paper has no marks, and acting on it would take off
  every mark this client had just made.

## The finding that changed the design

**Importing stored marks makes the engine report them as new ones.**
`importAnnotations` dispatches a create per item and then commits, so restoring a
paper's annotations emits a committed `create` for every one of them. A bridge
that persisted committed events would therefore rewrite every mark on a paper
each time it was opened — and, with the cross-window sync this task's exit state
requires, would bounce every incoming remote mark straight back as a local write.
The committed-only rule alone does not close this; it is a *second* write
amplification of the same family as the row-per-frame one the rule exists for.

What closes it is a record of what the engine and the database are believed to
agree on — a fingerprint per mark of page, contents and payload — updated
**before** the action that will be echoed. A change matching the fingerprint is an
echo and is dropped; anything else is real and is applied, in whichever direction
it came from. That record is also what makes the loop converge rather than
oscillate, and what keeps this bridge from ever touching an annotation the PDF
itself arrived carrying.

## Decisions taken with the user

- **The row's id is EmbedPDF's own** (a UUIDv4, minted inside the tool that draws
  the mark) rather than a UUIDv7 minted here. One identity for a mark everywhere,
  instead of an id map rebuilt on every load and kept true across two windows.
  Recorded as an exception in
  [zero-schema-conventions.md](../../../../research/data-modeling/zero-schema-conventions.md).
- **The twelve tools are one menu group in the toolbar's reserved slot**, not a
  strip of twelve buttons. Recorded in
  [reader-annotation.md](../../../../research/ui-ux/pages/lit-tracker/components/reader-annotation.md)'s
  2026-08-13 revision, with the accessibility consequences.
- **No colour control this task.** Every tool draws in its built-in colour.
- **Deleting a mark stays one click**, with no confirmation and no undo
  (user-decided 2026-08-16). Raised because the control sits just above the mark,
  which is also where a "click away to deselect" naturally lands — three marks
  were lost that way during testing. Judged acceptable: a mark takes seconds to
  redraw, and a confirmation would tax every deliberate deletion to protect
  against an occasional slip.
- **Removing a selection means both things**, and both are built: deleting a mark
  (a control on the selected mark) and clearing a text selection (Escape, or
  clicking the bare paper).
- **Copy, comments and a translucent rectangle are task 6**, spec'd separately
  rather than folded in here — they need UI decisions and research-doc revisions,
  and this task's diff is already about a new synced table.

## Log

- 2026-08-13 — **Implemented.** Schema, publication, generated Zero schema and
  `drizzle-zero.config.ts` in one migration (`0004_annotations.sql`); three
  mutators and one query, each authorized from `zeroContextFrom(session)`; the
  bridge; the tool menu. `useMutationRunner` was extracted from
  `useArticleMutations` so the annotation writes report a refusal through the
  same toast rather than a second, slightly different copy of that logic.
  Coverage held at **92.37%** against the 91.97% baseline — the prescription
  worked again: the decisions are in pure modules, and the wiring got a test of
  its own once it turned out to be where the echo rule actually lives.
- 2026-08-16 — **Browser pass, largely user-driven, and the task's real cost.**
  Seven defects, five of them in the seam between this project and EmbedPDF; the
  three timing and identity races in the bridge are now pinned by tests written
  against the symptom rather than the code. Deleting a mark was built here too:
  the mutator, the bridge and the cascade all existed and nothing on screen could
  reach them, which the task's own constraints already required. Escape and
  click-away round out "remove a selection".
- 2026-08-16 — **Merged** (PR #104, squash). CI green: Biome/typecheck/unit,
  integration, PR-title lint, with the ratchet logging 92.32% against the
  91.97% baseline. The branch tip was diffed against `main` after the squash
  merge and matched exactly. #99 closed; #95 at 4 of its sub-issues complete.
  The one item still owed — the multi-window sync check — travels to task 5's
  browser pass, which opens two windows anyway.

## Browser verification

Recorded here because both Playwright tiers are suspended, so this is the
primary evidence for everything a canvas does. **The user drove much of it**, and
that is not incidental: four of the defects below were found by their hands and
would not have failed any test in this repository as written.

**Confirmed**

- Marks are created and stored: shapes by click, ink by drag, text markup by
  dragging over text. Rows carry the right type, page and payload.
- **One ink stroke produced exactly one row** (5 → 6, ink 2 → 3), which is the
  rule this whole task is built around.
- Marks survive a reload and are redrawn **on the same words at a different
  zoom** — created at 114%, correct at 154% and after re-import at fit-width.
  Page-space coordinates hold, and looking is the only way to see it.
- Deleting a mark removes the row (9 → 8) and the mark.
- Clicking bare paper puts a selected mark down; Escape drops the text
  selection, the selected mark and the live tool. Neither writes anything.
- **No writes while idle**: with marks on the page and nothing happening, no row
  was rewritten across 12 seconds. This is the check that catches an echo loop,
  and it is worth more than any assertion in the unit suite — see below.
- The four-group toolbar fits at 420px, 1064px and 1440px, in both themes, with
  no horizontal overflow of the shell.

**Still owed** — the multi-window check. Zero drops sync for a hidden document,
so a second *tab* proves nothing; this needs a genuine second window and is the
one item not yet exercised.

## Defects found in the browser, none of which a unit test caught

Listed because the pattern is the point: every one lived in the space between
this project's code and EmbedPDF's, and the last three were found by the user
using the reader rather than by any check of mine.

1. **The tool menu clipped "sticky note."** `max-height` makes a popup a scroll
   container on *both* axes, so it clipped instead of sizing to its longest row.
2. **The toolbar vanished behind the paper.** EmbedPDF's scroller wraps each page
   in a `z-index: 1` container, which outranks a toolbar that deliberately has no
   `z-index` (task 3's finding: giving it one puts it above every portalled
   popup). The scroll region now forms its own stacking context.
3. **Dragging the page dragged the page.** It is rendered as an `<img>`, so a
   press-and-pull started a native image drag instead of selecting text —
   "highlighting is buggy", and it was.
4. **A new mark was deleted by its own sync.** A local write records the mark as
   applied; any delivery of rows arriving before that row was in it read as
   "deleted elsewhere". Marks are now `pending` until sync returns them.
5. **Rubber-banding on a quick drag** — and this one is the deepest. `jsonb` does
   not preserve key order (verified against Postgres directly: keys come back
   sorted by length). The fingerprint was `JSON.stringify`, so every stored mark
   was permanently *different from itself*: each delivery read as a remote edit,
   was applied to the engine, came back as a local change, and was written again.
   A loop, visible as jitter and invisible as a write storm. The fingerprint is
   now canonical, with array order deliberately preserved.
6. **The delete control could be aimed at but not pressed.** EmbedPDF's menu
   wrapper is `pointer-events: none` so a menu can never block the paper; the
   content inside has to take the pointer back.
7. **The three-dot menu sat off screen at 420px.** Four floating groups no longer
   fit where three did; the drawer trigger now sheds its word at the same
   breakpoint the annotation tool already does.

The lesson worth keeping is #5's: **a sync loop is invisible in the UI and
invisible to unit tests, but `updated_at` advancing on an untouched row states it
plainly.** Watching that column while the page sits idle is now the check to run
before believing any echo rule works.
