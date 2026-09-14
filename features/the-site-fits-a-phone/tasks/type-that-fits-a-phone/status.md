# Status: Type That Fits a Phone

**State:** Implemented, awaiting review **and the user's phone check**. Task 1
of 1.

- Branch: `the-site-fits-a-phone/type-that-fits-a-phone`, from `main` at
  `eb10a70` with the feature spec merged.
- Sub-issue: [**#169**](https://github.com/nicbk/nicbk-website/issues/169).
- PR: **TBD**.
- **On merge this completes #19** — check the parent issue
  [#168](https://github.com/nicbk/nicbk-website/issues/168) and close it by hand,
  which five of the last six features have needed. But the feature is **not done
  at merge**: the phone check is part of the definition of done.

## Why this task exists

Focusing a text field zooms the page on iOS, because four of this site's controls
compute below WebKit's 16px threshold. And a code block on a 375px screen showed
34 of its 62-character lines, with 214px of horizontal overflow.

## What shipped

**Four `@media (pointer: coarse)` rules**, each placed immediately after the
declaration it overrides and carrying the reason in prose — because a font-size
bump with no explanation is exactly what a later reader normalises away. Each
comment also says what is specific to *that* control: the card-menu input would
move the menu out from under the finger that opened it; the reader's note editor
would move the passage the note is about.

**One `clamp()`** on `.prose pre`:
`clamp(0.75rem, 0.63rem + 0.51vw, 0.875rem)`.

## What the browser measured

### The code block, in a real 375px Safari window

| | before | after |
|---|---|---|
| font-size | 14px | **12px** |
| character advance | 8.43px | 7.22px |
| characters that fit | 34 | **40** |
| horizontal overflow | 214px | **139px** |
| document scrolls sideways | no | **no** |

### The clamp's slope, measured rather than eyeballed

| viewport | size |
|---|---|
| 375px | 12px |
| 414px | 12.19px |
| 500px | 12.63px |
| 700px | 13.65px |
| 768px | 14.00px |
| 900px, 1100px | 14px |

It reaches the ceiling exactly at 768px — the same breakpoint the tracker's
layout uses — so anything tablet-sized and up is untouched.

### The four controls

Two different questions, answered two different ways.

**Does the build actually ship the rule?** Read from the CSSOM rather than the
source, so this is the served stylesheet. All four are present, each on the
hashed class its control uses:

```
._find_h8bft_132   { font-size: var(--font-size-md); }   filter rail
._filter_olpwi_145 { font-size: var(--font-size-md); }   card menu
._field_1cjf0_26   { font-size: var(--font-size-md); }   notes panel
._field_7ploe_33   { font-size: var(--font-size-md); }   reader note editor
```

Three appear on the collection route and the fourth only on the reader, which is
code splitting doing its job rather than a defect — both routes were checked.

**Is the desktop unchanged?** Each class applied to a probe element on a
`pointer: fine` machine: **all four still 14px.**

## What is not verified, and why

- **Whether iOS actually stops zooming.** Platform behaviour on hardware. The
  agent can show the rule ships and that 16px is what it sets; the phone is what
  confirms `pointer: coarse` matched and the zoom is gone. **This was the
  arrangement before the feature was accepted** and it is why the definition of
  done includes a step the agent cannot take.
- **Whether 12px reads comfortably.** Chosen from character counts, not from
  reading it. The clamp's floor is one number if it is wrong.
- **The annotation note editor at a larger font.** Its menu is sized from its
  contents, so touch makes it wider; the stylesheet flags it. Not reachable here
  — a mark must be selected, and the coarse branch does not apply on this
  machine anyway.

## Log

- 2026-09-14 — Implemented. 1643 unit tests pass (1627 + 16). Both changes were
  checked by reproducing their bug — removing one control's coarse rule and
  reverting the clamp — and confirming the tests fail.
- 2026-09-14 — Spec'd.
