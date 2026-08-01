# Status: Projects Page

**Feature state:** Implemented, awaiting PR + CI + review (2026-08-01).
Depends only on [`app-shell-and-home`](../app-shell-and-home/status.md)
(Complete) for the shell, header, tokens, and focus handoff.

Feature parent issue:
[#53](https://github.com/nicbk/nicbk-website/issues/53); task sub-issue
[#54](https://github.com/nicbk/nicbk-website/issues/54)
(`projects-page-content`), linked as a native sub-issue of #53.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `projects-page-content` | Implemented ([#54](https://github.com/nicbk/nicbk-website/issues/54)) | _pending_ | _pending_ | _pending_ |

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
