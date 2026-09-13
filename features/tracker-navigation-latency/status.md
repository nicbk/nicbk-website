# Status: Tracker Navigation Latency

**Feature state:** **Complete** — spec'd, built and merged on 2026-09-12, from
measurements taken the same day. Its one task went through its own PR + CI +
human review.

Depends on [`authentication`](../authentication/status.md) (#6, Complete) for
the guard this makes cheaper, and on
[`collection-view`](../collection-view/status.md) (#8, Complete) for the
navigation that pays for it.

Feature parent issue: [**#135**](https://github.com/nicbk/nicbk-website/issues/135),
with one sub-issue for the task, per
[issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md).
The roadmap entry is **#13** in [../index.md](../index.md). Its parent issue was
**checked** when the feature completed, and had *not* closed itself — #136's
merge left #135 open, and it was closed by hand. That contradicted the previous
day's revision and is now recorded as its
[2026-09-12 addendum](../../research/project-management-conventions/issue-and-pr-lifecycle.md):
the auto-close happens sometimes, so the check is the rule and either answer is
expected.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`session-resolved-once`](./tasks/session-resolved-once/status.md) | **Merged** | [#138](https://github.com/nicbk/nicbk-website/pull/138) | green | approved |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, the task
merged behind passing CI + human review. In short: a reader opens an article
from their collection and the page begins loading immediately, rather than after
a round trip to re-answer a question the browser already had.

## Notes carried into implementation

- **The last of the five.** This is the final item from what the user reported
  on 2026-08-17 after using the finished tracker; the other four became #12 and
  #14, both complete. It is also the only one of the four features born that way
  whose cause is not in the reader.
- **The work is ~15 ms and the wait is ~120 ms.** Validating the session is
  fast; asking is not. Any fix aimed at the query rather than the trip would be
  aimed at the wrong half — see [research.md](./research.md) for the numbers and
  where each was taken.
- **The guard is UX gating, and that was checked rather than assumed.** Every
  path that serves user data resolves the session itself, server-side. That is
  what makes this a latency change; if it ever stops being true, this feature's
  safety argument goes with it.
- **A server-side cache would be a session leak**, not a slower fix. One process
  serves every user. The task's constraints therefore demand a test, not a
  comment.
- **Sign-out does not reload the page**, so the cache has to be told. Two places
  — signing out and deleting the account — and missing either ships a reader who
  can walk back into an empty shell.
- **The browser already holds a session by a second mechanism**
  (`authClient.useSession()`, live today in the annotation sync). Reading that
  instead would remove a duplicate source rather than cache one, and was
  declined for this feature because `beforeLoad` is not a component. Recorded
  because it is the tidier answer if this is ever revisited.
- **What is given up is stated**: a session revoked elsewhere keeps showing the
  tracker's shell until the next full page load. Its data does not come with it.

## Log

- 2026-09-12 — **Complete.** PR #138 merged behind green CI and review, closing
  #136. The last of the five symptoms the user reported on 2026-08-17 after
  using the finished tracker, and the only one whose cause was outside the
  reader.
- 2026-09-12 — **Implemented.** The session is resolved once per page load and
  read thereafter; five client navigations now make one RPC instead of five.
  Both of the task's open questions were answered rather than deferred — the
  first navigation still pays (SSR's answer does not reach the browser), and the
  clearing calls stayed at the two sign-out sites because the alternative would
  have put Better Auth's browser client in the server bundle.
- 2026-09-12 — **Spec'd**, after #15 completed. Measured before written, as #12,
  #14 and #15 were: the count of round trips per navigation, the server-side cost
  of the answer, and the deployed host's RTT — three numbers that between them
  said the fix belongs in front of the trip rather than inside the query. The
  remedy's shape was settled with the user before any code.
