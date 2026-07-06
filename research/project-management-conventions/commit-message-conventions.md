# Commit Message Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

The commit message format that lands on `main`, given squash merge
(decided in
[branching-and-parallel-agent-strategy.md](./branching-and-parallel-agent-strategy.md))
means each task's PR becomes exactly one trunk commit — and GitHub's own
squash-merge default is to use the PR title as that commit's message. This
doc decides the format the PR title itself must follow.

## Decision

**Format: Conventional Commits** —
`<type>[(scope)]: <description>`, e.g.
`feat(lit-tracker): add upload status popup`.

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`,
`ci`, `style`. Breaking changes are marked with a `!` after the
type/scope (`feat(auth)!: ...`) or a `BREAKING CHANGE:` footer.

**Applies to the PR title, not every intermediate commit** on a task's
short-lived branch. Those intermediate commits get squashed away on merge
(per the already-decided squash-merge strategy), so only the final PR
title — which becomes the one commit that actually lands on `main` — needs
to conform. Commits on the in-progress branch itself can be freeform/WIP.

**Scope is optional**, typically the feature slug or sub-app area (e.g.
`lit-tracker`, `blog`) when it adds useful context; omitted for
project-wide changes.

**Footer:** the `Closes #<task-issue>` line already decided in
[issue-and-pr-lifecycle.md](./issue-and-pr-lifecycle.md) for the PR body
*is* Conventional Commits' own footer convention (a token, separator, and
value, one blank line after the description) — this is a confirmation that
the two already-decided conventions compose cleanly, not a new rule.

Enforcement (a PR-title linter in CI) is a mechanism owed to
[../devops-deployment/index.md](../devops-deployment/index.md), not yet
researched — this doc decides the format only.

## Reasoning

- Conventional Commits was chosen over a freeform message because squash
  merge already guarantees exactly one commit per task lands on `main` —
  a structured, typed format on that one commit is what turns `main`'s
  history into something a tool (or a human) can group and scan by type,
  which a freeform message can't offer.
- Anchoring the convention to the PR title (rather than trying to enforce
  it on every commit during implementation) follows directly from how
  squash merge actually works on GitHub: the PR title is what survives
  onto `main`, and intermediate commits are discarded, so requiring
  Conventional-Commits discipline on commits that won't exist after merge
  would be a rule with no observable effect on the trunk history.
- This directly sets up
  [changelog-and-versioning.md](./changelog-and-versioning.md): tools like
  `git-cliff`, `release-please`, and `conventional-changelog` all parse
  Conventional Commits directly to generate changelogs and determine
  version bumps — deciding the format now means that topic can evaluate
  those tools as genuinely available options rather than needing its own
  parsing scheme.

## Sources

- [conventionalcommits.org/en/v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) —
  the specification itself: type/scope/description structure, `!` and
  `BREAKING CHANGE:` for breaking changes, footer format.
- [github.blog — default to PR titles for squash merge commit messages](https://github.blog/changelog/2022-05-11-default-to-pr-titles-for-squash-merge-commit-messages/) —
  GitHub's own default behavior of using the PR title as the squash-merge
  commit message.
- [github.com/conventional-changelog/conventional-changelog](https://github.com/conventional-changelog/conventional-changelog),
  [git-cliff.org](https://git-cliff.org/) —
  automated changelog generation tools that parse Conventional Commits
  directly.
