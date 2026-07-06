# Research: Project Management Conventions

Status: fully researched and decided (2026-07-04), 6/6.

How work gets defined, tracked, branched, reviewed, and released. Scoped
comprehensively rather than as solo-dev conventions: multiple Claude Code
agents can work simultaneously on this project, each in its own isolated
worktree/branch, which is functionally equivalent to a multi-person team —
so this category covers real team-scale process (feature scoping, issue/PR
lifecycle, parallel branching strategy, review) rather than a lighter,
single-author version of it.

Boundary note: CI/pipeline *tooling and config* belongs to
[../devops-deployment/index.md](../devops-deployment/index.md) (not yet
researched), not here. This category owns the human/agent-facing process
side — e.g. what a review must verify — not how that gets automated/enforced
in a pipeline, so the two categories shouldn't end up duplicating each other
once both are decided.

## Topics

- [feature-definition-and-scoping.md](./feature-definition-and-scoping.md) —
  Decided. A feature is one vertical slice, sized via INVEST; every feature
  is a `features/<slug>/` folder (plan, description, constraints-and-behavior,
  testing, status, research) that always contains at least one
  `tasks/<slug>/` (concrete description/constraints-and-behavior/testing/
  status); mandatory traceability to decided research docs; per-task PR
  gated by CI/CD + human review before the next task starts.
- [issue-and-pr-lifecycle.md](./issue-and-pr-lifecycle.md) — Decided.
  GitHub Issues with native sub-issues (one parent issue per feature, one
  sub-issue per task); folders stay canonical for content, issues are the
  coordination layer; claiming via self-assign before starting a task;
  PRs close their task's sub-issue via closing keyword, auto-rolling up to
  close the feature issue; verified programmatically scriptable via
  `gh`/`gh api`.
- [branching-and-parallel-agent-strategy.md](./branching-and-parallel-agent-strategy.md) —
  Decided. Trunk-based development at task granularity: one short-lived
  branch per task (`<feature-slug>/<task-slug>`), isolated via one git
  worktree per active agent, squash-merged onto `main`, first-to-merge-wins
  + rebase on conflict, every task branch starts from latest `main`.
- [review-process.md](./review-process.md) — Decided. Three sequential
  gates per task: harness-agnostic agent self-review (behavioral
  verification, correctness/simplification review, security review), then
  automated CI/CD, then manual human review; Definition of Done separated
  from per-task acceptance criteria; feature DoD is a rollup of its tasks.
- [commit-message-conventions.md](./commit-message-conventions.md) —
  Decided. Conventional Commits format applied to the PR title (which
  becomes the one squash-merged commit on `main`), optional scope, the
  already-decided `Closes #issue` footer composes directly with it; sets
  up automated changelog generation for the next topic.
- [changelog-and-versioning.md](./changelog-and-versioning.md) — Decided.
  `CHANGELOG.md` auto-generated from Conventional Commits via `git-cliff`;
  no formal semver for the site as a whole (no downstream consumer needs
  it), revisitable per sub-app if one ever exposes a public API.
