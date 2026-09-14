# Feature: The Site Fits a Phone

**#19** in [../index.md](../index.md). Two reported items about type on a small
screen, pulling in opposite directions for the same reason.

## What it is

- **Focusing a field zooms the page on iOS.** WebKit zooms whenever a focused
  text control computes below 16px, and four of this site's controls sit at
  `--font-size-sm` — 14px, at every width.
- **Code blocks show about half a line.** `.prose pre` is a fixed 14px.
  Measured in a 375px window: 34 of the post's 62-character lines fit, with
  **214px of horizontal overflow**.

## Why they are one feature

Because both are the same mistake — **type sized for a desktop and never
re-decided for a phone** — and because fixing them looks contradictory unless
that is said out loud. The inputs get *bigger* on a phone and the code gets
*smaller*, which is not a compromise between two tastes: it is two different
constraints that happen to point opposite ways.

- A field must clear a platform threshold to stop the page lurching.
- A code block must fit characters into a 375px column.

Grouping them also respects the one thing this feature cannot do for itself:
**the verification is the user's phone**, and asking for two separate checks of
two two-line CSS changes is worse than asking once (user-decided 2026-09-14).

## What it delivers

- **Fields that do not zoom the page**, on touch devices only — the desktop
  rail, card menu and note editors keep the quiet 14px they were designed with
  (user-decided 2026-09-14).
- **Code that fits more of its line on a phone**, fluid from 12px up to today's
  14px, with desktop untouched.

## What it does not do

- **It does not disable pinch-zoom.** The other common "fix" for the iOS
  behaviour is `maximum-scale=1` or `user-scalable=no` in the viewport meta.
  That is a WCAG 1.4.4 failure and this project's viewport tag is deliberately
  clean — `width=device-width, initial-scale=1`. It stays that way.
- **It does not make every code line fit.** Fitting the 62-character line in a
  375px column needs about 8px type, which is unreadable. Long lines still
  scroll horizontally inside the block, which is what `overflow-x: auto` is
  there for.
- **It does not touch the controls already at 16px** — the collection search,
  the article-edit dialog, the authors editor, the delete-account confirm, and
  the reader's page-number field.
- **It is not a general mobile pass.** Other things may want attention on a
  phone; these are the two that were reported and measured.

## Exit state

Tapping the tag filter on an iPhone puts a cursor in it and leaves the page
where it was. A code block on the same screen shows appreciably more of each
line. Nothing on a desktop looks different except the code, which is slightly
smaller only below the breakpoint.
