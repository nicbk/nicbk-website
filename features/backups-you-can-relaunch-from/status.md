# Status: Backups You Can Relaunch From

**Feature state:** **Spec'd** (2026-11-12). P32-1 and P32-2 are decided
([plan.md](./plan.md#decided-with-the-user-2026-11-12)). Awaiting the user's
go-ahead.

Spec written against `main` plus the docs-only research commits on
`claude/modest-shannon-jew14d` (at `315a836`). See [research.md](./research.md).

Depends on #7, #11 and #31, all complete.

Feature parent issue: not yet created. It and one sub-issue per task are opened
on the go-ahead. Roadmap entry **#32**.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| [`deletions-wait-a-day`](./tasks/deletions-wait-a-day/status.md) | Spec'd | — | — | — |
| [`a-checkpoint-every-six-hours`](./tasks/a-checkpoint-every-six-hours/status.md) | Spec'd | — | — | — |
| [`a-restore-that-relaunches`](./tasks/a-restore-that-relaunches/status.md) | Spec'd | — | — | — |
| [`drills-and-a-watcher`](./tasks/drills-and-a-watcher/status.md) | Spec'd | — | — | — |
| [`the-images-are-kept`](./tasks/the-images-are-kept/status.md) | Spec'd | — | — | — |

## Operator steps this feature writes down

Each is written into the runbook by the task named, and done by the operator
after that task merges:

- the B2 bucket, its three keys, and the lifecycle rule (task 2);
- the deletion-as-hide check (task 2);
- the ntfy topic (task 2);
- the break-glass set (task 2);
- enabling `services.nicbk-website.backup` in the system flake (task 2);
- the relay watcher (task 4);
- the quarterly drill (task 4).

## Log

- 2026-11-12: P32-1 (30 days) and P32-2 (the size ceiling; the one-year limit
  until encryption) decided.
- 2026-11-12: spec'd from the request of 2026-10-14 and the decided revision.
