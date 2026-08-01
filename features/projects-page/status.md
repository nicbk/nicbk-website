# Status: Projects Page

**Feature state:** Complete (2026-08-01). Its one task
(`projects-page-content`,
[#55](https://github.com/nicbk/nicbk-website/pull/55)) is merged, which also
completes **Phase 1**. Depends only on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete) for the
shell, header, tokens, and focus handoff.

Feature parent issue:
[#53](https://github.com/nicbk/nicbk-website/issues/53); task sub-issue
[#54](https://github.com/nicbk/nicbk-website/issues/54)
(`projects-page-content`), linked as a native sub-issue of #53.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `projects-page-content` | Merged ([#54](https://github.com/nicbk/nicbk-website/issues/54)) | [#55](https://github.com/nicbk/nicbk-website/pull/55) | passed | merged |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met, behind
passing CI + human review. In short: `/projects` shows a "projects" heading
over a list of sub-applications — one entry, the Academic Literature Tracker,
as a name plus a dimmer one-line description — correct in both themes at
narrow/mid/wide widths, at WCAG 2.2 AA, with the placeholder route gone and no
link pointing at a Literature Tracker URL that does not exist yet.

## Log

- 2026-08-01 — Feature spec'd and implemented as a single task. Chose (with
  the user) to ship the entry as plain text rather than a link, because the
  Literature Tracker has no route and no decided URL yet; see
  [research.md](./research.md) for the reasoning and the follow-up owed to the
  Phase 3 feature that creates it. Details in the
  [task status](./tasks/projects-page-content/status.md). Awaiting PR + CI +
  review.
- 2026-08-01 — **Merged as [#55](https://github.com/nicbk/nicbk-website/pull/55)**
  (CI green, approved) — feature complete, and with it Phase 1.
