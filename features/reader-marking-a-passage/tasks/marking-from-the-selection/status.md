# Status: Marking From the Selection

**State:** **Merged** — `ef1ff81`
([PR #133](https://github.com/nicbk/nicbk-website/pull/133)), 2026-09-11, behind
green CI and human review. Second of two, and the last — **it closed the
feature**.

- Branch: `reader-marking-a-passage/marking-from-the-selection`, from `main` at
  `eacdc1a`, which is task 1 merged.
- Sub-issue: [**#130**](https://github.com/nicbk/nicbk-website/issues/130),
  closed by the PR.
- PR: [**#133**](https://github.com/nicbk/nicbk-website/pull/133), CI green.
- ~~**On merge, close parent issue #128 by hand**~~ — **it closed itself**, in
  the same second this task's sub-issue did. GitHub's behaviour changed between
  2026-08-23 and 2026-09-11; the evidence and the corrected rule are in
  [issue-and-pr-lifecycle.md](../../../../research/project-management-conventions/issue-and-pr-lifecycle.md)'s
  2026-09-11 revision.

## Why this task exists

Because a touch reader has no way to hold a tool and a selection at once:
picking a tool clears the selection, and a live tool takes the hold. Both guards
are correct and neither is being reversed, so the way through is to mark from
the selection itself — decided with the user on 2026-09-11, and consistent with
`reader-annotation.md`'s existing reason for putting delete beside the mark and
copy beside the selection.

## Open items, as settled

All three were settled by what the project had already decided, rather than
needing a fresh choice — which is what the reading was for.

- **`squiggly` earns its place, because the glyphs are small enough.** The
  control measures **217px** at 500px wide, inside a 475px panel: copy with its
  word, a divider, four glyphs. Nothing had to be dropped, so the "which tools
  belong here" conversation never had to happen.
- **Glyphs for the tools, the word for copy.** Copy reports an outcome —
  "copied", "could not copy" — and a control whose purpose is to say what
  happened has to say it; the tools report nothing, because the mark appearing
  *is* the report. Four more words would have made the bar wider than the paper
  on a phone. The glyphs are the toolbar's own, from
  `ANNOTATION_TOOL_GROUPS`'s `text` group, so there is one vocabulary rather
  than two — and each carries the toolbar's word as its accessible name, which
  is the same trade the mark's menu already makes.
- **Nothing is selected after marking.** EmbedPDF's text tools carry no
  `selectAfterCreate`, so the toolbar flow leaves nothing selected; matching it
  keeps the two paths indistinguishable, which is this task's own acceptance
  criterion. The selection is spent and the menu goes with it.

## What the implementation added beyond the plan

- **The commit path was extracted, not copied.** Task 1 had the marking inside
  its pointer handler; it now lives in `selection-finish/mark-selection.ts` and
  both callers use it. The plan required this ("the commit path is task 1's, not
  a second one written here") and it is the reason this task adds no marking
  logic at all.
- **A second permission question.** `canAddAnnotations` sits beside
  `canCopyText`: a PDF can permit copying and forbid marking, the annotation
  plugin refuses such a create as silently as the selection plugin refuses a
  copy, and four controls that do nothing would be four lies. Unlike copy —
  which stays visible and explains itself — these are simply absent, because the
  explanation would not fit beside a selection and there are four of them.
- **The component was renamed.** `selection-copy-menu.tsx` →
  `selection-menu.tsx`: it is no longer a copy control, and a name that says it
  is would be the kind of drift that makes code lie.

## Browser verification

Against the Compose app, *Attention Is All You Need*, at 1400px in dark and
500px in light, with a page break on screen.

**Confirmed** — every line of [testing.md](./testing.md):

- **A passage selected by touch is marked by tapping the action** — the reported
  defect, and the thing that was impossible before. A hold, then *highlight*:
  one row, quoting the 12 characters selected.
- **Across a page break too**: a hold, the end handle dragged onto the next
  page, then *underline* — **two rows**, page 0 and page 1, each quoting the
  passage's 502 characters. Drawn on both pages.
- **The mark matches a toolbar-made one**: all of them appear in the sidebar
  quoting their passage, with `p. 1` / `p. 2`, and **survive a reload**.
- **The selection is spent**: no handles, no menu, and — the point of this
  design — **no tool was activated**, so nothing was cleared by a mode change.
- **Keyboard**: each action is in the tab order, takes focus, and activating
  *strikeout* from the keyboard made its mark.
- **The toolbar's own flow is untouched**: highlight picked from the toolbar,
  dragged over a line, one row — and the tool **stays live** afterwards, as #9
  decided.
- **It fits where it has least room**: 217px wide inside a 475px panel at 500px,
  legible in light and dark.
- Console clean apart from the theme hydration warning that predates this work.
- The five marks made while verifying were **deleted by the ids recorded when
  they were made**; the user's own four articles still hold 7, 3, 2 and 5.

**Touch is synthetic**, as everywhere in #12 and this feature: dispatched
pointer events with the capture calls stubbed. A real thumb is still owed. The
*mouse* paths here were driven with the browser's own input, for the reason
task 1's status records.

## Log

- 2026-09-11 — Implemented and browser-verified. All three open items settled by
  existing decisions; the only genuine addition beyond the plan was the second
  permission question.
- 2026-09-11 — Filed with the feature.
