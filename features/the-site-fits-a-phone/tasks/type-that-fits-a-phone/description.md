# Task: Type That Fits a Phone

Task 1 of 1 of [the-site-fits-a-phone](../../description.md) (#19).

## What it does

Two changes to type sizing on small screens, in opposite directions and for
different reasons.

### Four text controls reach 16px on touch devices

WebKit zooms the page when a focused text control computes below 16px. These sit
at `--font-size-sm` — 14px, at every width:

| Control | File |
|---|---|
| tag find field | `filter-groups.module.css` `.find` |
| card-menu tag input | `article-tag-controls.module.css` `.filter` |
| notes textarea | `notes-panel.module.css` |
| annotation note textarea | `annotation-note-editor.module.css` |

Each gains a `@media (pointer: coarse)` rule raising it to `--font-size-md`,
placed beside the declaration it overrides so the pair reads as one decision.

**Touch only.** The desktop rail, card menu and note editors keep the quiet 14px
they were designed with (user-decided 2026-09-14).

### Code blocks shrink on a narrow column

`.prose pre` becomes a `clamp()` bottoming out at 12px and topping out at today's
14px, following the fluid pattern `--font-size-lg` and `--font-size-xl` already
use. At 375px that takes a block from 34 characters to 40.

## What it does not change

- **The viewport meta.** Suppressing zoom is the shortcut for the iOS item and a
  WCAG 1.4.4 failure. It is not on the table.
- **The five controls already at 16px** — the collection search, the article-edit
  inputs, the authors editor, the delete-account confirm, and the reader's page
  number. Correct already; tidying them in would widen the diff for no behaviour.
- **`overflow-x: auto` on the block.** Long lines still scroll, because fitting
  the measured 62-character line needs ~8px type.
- **Inline code** (`0.9em`, relative to the prose around it). If it looks wrong
  beside a 12px block on a phone that is a finding for the browser pass, not an
  assumption to act on now.

## Why one task for two unrelated changes

Because the verification is the user's phone, and two CSS changes totalling about
six lines do not justify asking them to pick it up twice. Reasoning in full in
[the plan](../../plan.md).
