# Status: Projects Page

**Feature state:** Complete (2026-08-01). Its one task
(`projects-page-content`,
[#55](https://github.com/nicbk/nicbk-website/pull/55)) is merged, which also
completes **Phase 1**. Depends only on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete) for the
shell, header, tokens, and focus handoff.

Feature parent issue:
[#53](https://github.com/nicbk/nicbk-website/issues/53) (closed
2026-08-01 — by hand, see the log); task sub-issue
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
- 2026-08-01 — Parent issue #53 **closed by hand**, some hours late. It had
  stayed open because
  [issue-and-pr-lifecycle.md](../../research/project-management-conventions/issue-and-pr-lifecycle.md)
  recorded that GitHub closes a parent once its sub-issues close — it does not;
  it only rolls up progress. Corrected there as a dated revision, so closing
  the parent is now an explicit step in finishing a feature. The follow-up this
  feature deferred — turning the Literature Tracker entry into a real link — is
  owned by
  [`lit-tracker-shell`](../article-upload-and-extraction/tasks/lit-tracker-shell/description.md),
  now that #7's spec has settled the tracker's URL as `/lit-tracker`.
