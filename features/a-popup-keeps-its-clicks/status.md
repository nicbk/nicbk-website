# Status: A Popup Keeps Its Clicks

**Feature state:** **Complete** (2026-09-14) — both fixes merged: the card's guard
(#176), and the same guard on the title `<Link>` (#177), whose handler was found in
the browser after the first merge. The #177 tip was diffed against `main` after
merge; nothing dropped. Parent #173 closed by hand.

Spec written against `main` at `f512c18`, from a reproduction taken on
`nicbk.com` before anything was written. See [research.md](./research.md).

Depends on [`collection-view`](../collection-view/status.md) (#8, Complete) for
the card and its click handler, and on [`article-edit`](../article-edit/status.md)
(#11, Complete) for the two dialogs mounted inside it.

Feature parent issue: [**#173**](https://github.com/nicbk/nicbk-website/issues/173),
with one sub-issue, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#20** in [../index.md](../index.md). Its parent issue is
**checked** on completion and **closed by hand** — five of the last six needed it.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`clicks-stay-inside-the-popup`](./tasks/clicks-stay-inside-the-popup/status.md) | **Complete** ([#174](https://github.com/nicbk/nicbk-website/issues/174)) | [#176](https://github.com/nicbk/nicbk-website/pull/176), [#177](https://github.com/nicbk/nicbk-website/pull/177) | green | approved |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, the task merged
behind passing CI + human review. In short: the reproduction no longer
reproduces, and clicking a card still opens the article.

## Notes carried into implementation

- **The cause is React's event tree, not the DOM.** The popup is not a DOM
  descendant of the card — measured — so native bubbling cannot explain the
  navigation. React portals bubble through the React tree, where `ArticleMenu`
  is a child of the `<article>` carrying the handler.
- **The fix is one condition in the card's handler**, not `stopPropagation` on
  five popups. The latter is a call site per component forever, and forgetting
  one fails silently.
- **Test the complement of the guard's exception list.** Every actionable item in
  a popup is already skipped by `openUnlessControl`, so clicking one proves
  nothing. The defect lives on inert surface — the popup's 12px `padding-top`
  and its details block — which is why three earlier passes missed it.
- **A portal test can pass for the wrong reason.** If the portalled node ends up
  inside the card's own subtree, `contains` is true and the assertion means
  nothing. The test must assert the node is outside the card in the DOM.
- **~~Only the card has a container-level click handler.~~ Wrong — see the task's
  status.** The title `<Link>` has one inside the router library. Verified across `src/`:
  every other `onClick` is on a real control. One site, not a class of them.

## Log

- 2026-09-14 — **Complete.** #177 merged; #173 closed by hand. The feature took two
  PRs where the plan had one, because the spec's audit searched for `onClick=` and
  the second handler lives inside the router library — found by clicking the
  venue tooltip, not by reading. Still unverified: the footer's own tooltips (none
  elided on local data) and a Safari after-check.
- 2026-09-14 — **Implemented.** One condition, a comment several times longer
  than it, and two guidelines. Worth recording: **the unit tier could prove this
  one**, because jsdom models React's synthetic events exactly as a browser does
  — the test opens a real menu, clicks its surface rather than an item, and fails
  with `navigate` called twice when the condition is removed. Most of this week's
  defects needed a browser precisely because they were about paint and layout;
  this one is about event routing, which is not.
- 2026-09-14 — **Spec'd**, after the item was finally reproduced. It had resisted
  two earlier attempts, and the reason was instructive: the card's guard already
  skips every control, so clicking menu *items* — the obvious thing to click —
  behaves correctly. It also turned out not to be engine-specific, which is what
  the earlier attempts had assumed when Chrome came up clean. The blast radius is
  larger than reported: the two dialogs mounted from the menu are affected too,
  so clicking a label while correcting an article's metadata navigates away from
  the form.
