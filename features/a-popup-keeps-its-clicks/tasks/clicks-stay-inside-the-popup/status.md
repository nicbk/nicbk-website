# Status: Clicks Stay Inside the Popup

**State:** Not started. Task 1 of 1.

- Branch: `a-popup-keeps-its-clicks/clicks-stay-inside-the-popup`, from `main`
  with the feature spec merged.
- Sub-issue: [**#174**](https://github.com/nicbk/nicbk-website/issues/174).
- PR: **TBD**.
- **On merge this completes #20** — check the parent issue
  [#173](https://github.com/nicbk/nicbk-website/issues/173) and close it by hand.

## Why this task exists

Clicking an open menu's own padding opens the card behind it. Reproduced on
`nicbk.com`: `/lit-tracker` → `/lit-tracker/01a092c2-…` from a click hit-tested
to the popup and confirmed not to be a control.

## What to do first

Re-run the reproduction before changing anything, so the "before" is observed
rather than taken from the spec — and because the hit-test is the part that
earlier attempts got wrong.

## Log

- 2026-09-14 — Spec'd.
