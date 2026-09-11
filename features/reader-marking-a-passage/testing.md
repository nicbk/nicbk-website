# Testing: Reader Marking a Passage

Feature-wide tiers. Per-task specifics are in each task's `testing.md`.

## Unit (Vitest + `@testing-library/react`, jsdom)

The tier that carries this feature, because both halves are decisions over
state rather than pixels:

- **Whether a selection needs finishing** — a pure question over what the
  plugin reports: selecting and a range (needs it), not selecting (does not),
  no range (does not), and the same selection twice (finished once).
- **What a markup commit produces** — one annotation per page of a formatted
  selection, carrying the live tool's own defaults and the selected text.
- **The control's contents and behaviour** — which actions it offers, what each
  one does, what it does when the document withholds permission.

## Integration

Nothing new. No table, no mutator, no route: marks made here are the rows #9
built, written through the mutators it shipped, and `annotation-sync/`'s own
integration coverage already exercises that path.

## Browser verification (record in each task's status.md — primary evidence)

Both Playwright tiers stay suspended, so the browser pass is primary evidence.
Against the Compose app, with a page break on screen:

- A markup tool dragged **across a page break** marks both pages — one row each,
  covering the right text.
- A cross-page selection offers **`copy`**, and copies the whole passage.
- A passage selected **by touch** is marked by tapping the action, on one page
  and across a break.
- The mark is **indistinguishable from a toolbar-made one**: same sidebar entry,
  same floating menu, same quoted text, and it survives a reload.
- **Nothing #12 or #9 shipped regresses** — the hold, the handles, the
  magnifier, the sticky draw tools, click-away, Escape.
- Both themes; narrow (500px), mid and wide.

**Touch is synthetic unless stated.** As with all of #12, gestures are
dispatched pointer events with the capture calls stubbed; each status says so
plainly, and a real thumb remains owed.

## Data hygiene

Every mark made while verifying is **deleted by the id recorded when it was
made**, never by a time window — the user reads papers in the same database
while verification runs.

## Coverage

Ratchet applies (`node scripts/coverage-ratchet.mjs <current> <baseline>`). The
pure pieces — "does this need finishing", "what does this commit produce" — are
what keep it honest.
