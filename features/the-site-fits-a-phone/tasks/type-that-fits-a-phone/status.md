# Status: Type That Fits a Phone

**State:** Not started. Task 1 of 1.

- Branch: `the-site-fits-a-phone/type-that-fits-a-phone`, from `main` with the
  feature spec merged.
- Sub-issue: [**#169**](https://github.com/nicbk/nicbk-website/issues/169).
- PR: **TBD**.
- **On merge this completes #19** — check the parent issue
  [#168](https://github.com/nicbk/nicbk-website/issues/168) and close it by hand,
  which five of the last six features have needed. But note the feature is not
  done at merge: **the user's phone check is part of the definition of done.**

## Why this task exists

Focusing a text field zooms the page on iOS, because four of this site's controls
compute below WebKit's 16px threshold. And a code block on a 375px screen shows
34 of its 62-character lines, with 214px of horizontal overflow.

## What to do first

Re-take both measurements — the four controls' computed sizes, and the code
block's character count at 375px — because they are the acceptance criteria in
numeric form and because the 375px window is a method this project has only just
established (see [the feature's research](../../research.md)).

## Log

- 2026-09-14 — Spec'd.
