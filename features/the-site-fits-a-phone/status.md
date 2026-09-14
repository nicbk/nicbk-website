# Status: The Site Fits a Phone

**Feature state:** **In progress** (2026-09-14) — the task is implemented and
awaiting review **and the user's phone check**, which is part of the definition
of done rather than a follow-up.

Spec written against `main` at `44300c7`, from measurements taken in a **real
375px viewport** before anything was written. See [research.md](./research.md).

Depends on [`blog`](../blog/status.md) (#4, Complete) for the post page's prose
styles, and on [`collection-view`](../collection-view/status.md) (#8),
[`article-detail-and-reader`](../article-detail-and-reader/status.md) (#9) and
[`article-edit`](../article-edit/status.md) (#11) for the four controls.

Feature parent issue: [**#168**](https://github.com/nicbk/nicbk-website/issues/168),
with one sub-issue, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#19** in [../index.md](../index.md). Its parent issue is
**checked** on completion and **closed by hand** — five of the last six did not
close themselves.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`type-that-fits-a-phone`](./tasks/type-that-fits-a-phone/status.md) | Implemented ([#169](https://github.com/nicbk/nicbk-website/issues/169)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, the task merged
behind passing CI + human review, **and the user's phone check passed**. That
last clause is unusual and deliberate: one of this feature's two halves cannot be
confirmed from here.

## Notes carried into implementation

- **The user is the verifier for the iOS half** (agreed 2026-09-14, before the
  feature was accepted). The agent proves the computed size clears 16px in a real
  375px viewport; the phone answers whether the zoom is gone.
- **Never suppress zoom.** `maximum-scale=1` / `user-scalable=no` is the common
  shortcut for this and is a WCAG 1.4.4 failure. The viewport tag is clean and
  stays clean.
- **16px is a threshold.** 15.9px zooms, so the expression must resolve to at
  least 16 — which rules out `em` on a clamped surface. `--font-size-md` is
  exactly 1rem.
- **`pointer: coarse`, not a width query** — the same capability-query reasoning
  the project already applies to `@media (hover: hover)`.
- **Only four controls.** Five others are already at 16px and are not to be
  tidied into this diff.
- **12px is a floor chosen from character counts, not from comfort.** If it reads
  small on a real screen, the clamp's floor is one number to change.
- **Narrow-width verification is possible after all.** Safari accepts arbitrary
  window bounds by AppleScript where Chrome refuses below ~500px. The "could not
  reach 320px" notes in #17 and #18 were a limitation of the tool being used.

## Log

- 2026-09-14 — **Implemented.** The code block went from 34 characters to **40**
  at 375px, with overflow down from 214px to 139px and the document still not
  scrolling sideways; the clamp reaches its 14px ceiling exactly at 768px, so
  desktop is untouched. All four coarse-pointer rules were confirmed **in the
  served CSSOM** rather than only in source — three on the collection route and
  the fourth on the reader, which is code splitting working — and all four still
  compute 14px on a `pointer: fine` machine. What remains is the phone.
- 2026-09-14 — **Spec'd**, the same day #18 completed. The two reported items
  were measured first and turned out to pull opposite ways — fields must get
  *bigger* on a phone to clear a platform threshold, code must get *smaller* to
  fit a column — which is the reason they are specified together with the
  reasoning stated rather than as two unrelated tweaks. The measurement also
  found that the iOS item affects **four** controls rather than the one the
  report implied, and that five others were already safe.
