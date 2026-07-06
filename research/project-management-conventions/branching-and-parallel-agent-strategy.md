# Branching and Parallel Agent Strategy

Researched: 2026-07-04. Decided: 2026-07-04.

The git branching model underneath the `features/<slug>/tasks/<slug>/`
hierarchy ([feature-definition-and-scoping.md](./feature-definition-and-scoping.md))
and per-task PR gate
([issue-and-pr-lifecycle.md](./issue-and-pr-lifecycle.md)): branch
granularity and naming, how multiple simultaneous agents stay isolated,
merge strategy, and conflict resolution when parallel work collides.

## Decision

**Trunk-based development, at task granularity.** A single mainline
(`main`); no long-lived Git-Flow-style `develop`/`release` branches — this
fits a continuously-deployed personal site with no version-locked release
trains. Every *task* (not feature) gets its own short-lived branch, created
off the latest `main`, living only as long as it takes to implement that
one task.

**Branch naming: `<feature-slug>/<task-slug>`**, mirroring the
`features/<feature-slug>/tasks/<task-slug>/` folder path directly. This
gives one naming scheme to remember (identical to the folder path, minus
the literal `features/`/`tasks/` segments) instead of a separate branch
taxonomy. The issue number isn't duplicated into the branch name — it's
already linked via the PR's closing keyword and recorded in the task's
`status.md`.

**Isolation: one git worktree per active agent/task**, each on its own
branch, sharing the same underlying `.git` object store. This is already
this environment's default mechanism (the `EnterWorktree` tool) — this
decision confirms it's the right tool for the job and that every agent
picking up a task must isolate into its own worktree before editing, per
existing tool guidance, rather than working directly in a shared checkout.

**Work decomposition avoids collisions before git has to resolve them.**
Features/tasks are already required to be sized by domain/file-boundary
independence (the "Independent" criterion in
[feature-definition-and-scoping.md](./feature-definition-and-scoping.md));
this is the actual mechanism that keeps simultaneously-active branches from
touching the same files from different directions. Restated here because
it's the real first line of defense — the branching/merge rules below are
what happens when decomposition isn't perfect, not a substitute for it.

**Merge strategy: squash merge.** Each task's PR lands on `main` as exactly
one squashed commit, regardless of how many commits accumulated on the
branch during implementation/review iteration. This keeps `main`'s history
at one-commit-per-task granularity — readable `git log`, useful
`git bisect` — and matches the per-task PR granularity already decided.

**Conflict resolution:** if two simultaneously-active task branches do
collide despite decomposition, first-to-merge wins; the other task's
branch must rebase onto the updated `main` and resolve conflicts locally
before its PR can proceed. No long-lived merge-reconciliation branches —
short-lived branches are cheap to rebase precisely because they haven't
drifted far from `main`.

**Every task branch starts from the latest `main`**, not from another
in-progress task's branch — including tasks within the same feature that
are deliberately sequenced. The per-task gate already decided in
`issue-and-pr-lifecycle.md`/`feature-definition-and-scoping.md` (a task's
PR must pass CI + human review before the next task starts) guarantees the
next task's branch point already includes the prior task's squashed commit,
so there's never a need to branch off an unmerged branch.

## Reasoning

- Trunk-based development (vs. Git Flow) is the sourced fit for small/
  informally-coordinated teams and continuous delivery — this project has
  no scheduled release trains or compliance gate that would justify Git
  Flow's long-lived branches, and short-lived branches directly minimize
  the window in which two agents' branches can drift apart and conflict.
- Task-granularity branches (not feature-granularity) follow directly from
  the per-task PR gate already decided — a feature-level branch containing
  multiple tasks would just reintroduce a second, coarser merge unit
  alongside the one that already governs the workflow.
- Mirroring the folder path in the branch name was chosen over a
  type-prefixed scheme (`feature/`, `fix/`, etc., the common convention
  found in research) because this project's workflow doesn't distinguish
  task *types* at the branching level — every task goes through the same
  folder structure and the same PR gate regardless of whether it's a new
  feature or a fix, so a type prefix would carry no information a type-free
  path doesn't already convey, while the folder-mirroring name adds a real
  benefit (one scheme instead of two).
- Git worktrees are the specifically-cited 2026 mechanism for parallel AI
  agent execution — isolating each agent's working directory and git index
  while sharing one object store is exactly what prevents the file-level
  conflicts and lock contention multiple simultaneous agents would
  otherwise hit. This project's tooling already defaults to this mechanism,
  so the decision here is confirming it's correct, not introducing it.
- Squash merge was chosen on a directly sourced trade-off: it only makes
  sense with small, short-lived branches (which task-granularity branching
  already guarantees), and in exchange gives a linear one-commit-per-task
  `main` history — valuable here because the per-task PR is already the
  unit of review and CI gating, so the trunk history should reflect that
  same unit.
- First-to-merge-wins-then-rebase (rather than a locking/reservation
  scheme) is the standard trunk-based-development answer to conflicts
  precisely because short-lived branches make rebasing cheap — the
  decomposition rule is what should make this rare, and rebasing a
  branch that's only hours old is a small cost when it does happen.

## Sources

- [augmentcode.com — git worktrees for parallel AI agent execution](https://www.augmentcode.com/guides/git-worktrees-parallel-ai-agent-execution),
  [mindstudio.ai — git worktrees for AI coding](https://www.mindstudio.ai/blog/git-worktrees-parallel-ai-coding-agents) —
  worktrees isolating working directory/git index per agent while sharing
  one object store; decomposing parallel work by domain/file boundary to
  avoid collisions.
- [atlassian.com — trunk-based development](https://www.atlassian.com/continuous-delivery/continuous-integration/trunk-based-development),
  [mergify.com — trunk-based development vs. Gitflow](https://mergify.com/blog/trunk-based-development-vs-gitflow-which-branching-model-actually-works) —
  short-lived branches, small/informal teams, continuous delivery fit.
- [medium.com — naming conventions for git branches](https://medium.com/@abhay.pixolo/naming-conventions-for-git-branches-a-cheatsheet-8549feca2534),
  [graphite.com — git branch naming conventions](https://graphite.com/guides/git-branch-naming-conventions) —
  kebab-case, hierarchical slash-separated branch naming (adapted here to
  mirror the folder path instead of a type-prefix scheme).
- [dadrian.io — trunk-based development with git](https://dadrian.io/blog/posts/trunk-based-development-with-git/),
  [anttih.com — squash merge all the things](https://anttih.com/blog/squash-merge-all-the-things/) —
  squash merge as the standard pairing with trunk-based development,
  one-commit-per-PR linear history, only viable with small/short-lived
  branches.
