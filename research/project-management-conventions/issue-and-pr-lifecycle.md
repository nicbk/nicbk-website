# Issue and PR Lifecycle

Researched: 2026-07-04. Decided: 2026-07-04.

How the `features/<slug>/` and `tasks/<slug>/` hierarchy decided in
[feature-definition-and-scoping.md](./feature-definition-and-scoping.md)
maps onto GitHub Issues and PRs: tracker choice, numbering, claiming
(avoiding duplicate parallel work), and how PRs close out issues.

## Decision

**Tracker: GitHub Issues**, using GitHub's native sub-issues — one parent
issue per feature, one sub-issue per task. No separate external tracker;
this project's tooling (`gh` CLI) already lives on GitHub.

**Numbering:** GitHub's own auto-incrementing issue numbers are exactly the
numbers referenced by `TODO(#issue):`
([code-comments.md](../coding-conventions/code-comments.md)) — whichever
issue (feature or task) the TODO concerns.

**Folders stay canonical for content; issues are the coordination layer.**
A feature's `status.md` records its parent issue number; a task's
`status.md` records its sub-issue number and (once opened) its PR number.
The issue doesn't duplicate the folder's plan/behavior/testing detail —
it only tracks assignment, linking, and closure.

**Claiming = self-assign.** Before starting a task, an agent checks its
sub-issue is unassigned, then assigns it to itself (`gh issue edit <n>
--add-assignee "@me"`, or the equivalent for whatever identity the agent
runs as) before beginning implementation. An assigned, open sub-issue is a
hard "do not start this" signal to every other agent — this is the
multi-agent-parallelism analog of the standard OSS convention of assigning
yourself before starting work, and mirrors how GitHub's own Copilot coding
agent is assigned parallel work today.

**PR linking:** each task's PR closes its sub-issue via a closing keyword
in the PR body (`Closes #<task-issue>`). Merging the PR auto-closes the
sub-issue; GitHub automatically rolls that up into the parent feature
issue's progress and closes the feature issue once every task sub-issue is
closed — no manual status bookkeeping required.

**No feature-level PR.** Only tasks get PRs, per the per-task gate already
decided in `feature-definition-and-scoping.md` — the feature issue's
closure is a side effect of its sub-issues closing, not its own merge.

**Programmatic mechanics, for whichever agent executes this workflow:**

- Create/assign/close: `gh issue create`, `gh issue edit --add-assignee`,
  `gh issue close` cover this directly.
- Sub-issue parent/child linking has no dedicated `gh issue` subcommand yet,
  but is reachable via `gh api POST
  /repos/{owner}/{repo}/issues/{issue_number}/sub_issues`. That endpoint
  takes the sub-issue's internal numeric `id`, not its visible `#number` —
  look the `id` up first (e.g. `gh api repos/{owner}/{repo}/issues/{number}`)
  before calling it.
- PR-to-issue linking needs no API call at all: a closing keyword in the
  PR body (which `gh pr create --body` already sets) is sufficient.

## Reasoning

- GitHub Issues over a separate tracker: adding a second tracker would be a
  second source of truth to keep in sync with the folder hierarchy, which
  directly contradicts [AGENTS.md](../../AGENTS.md)'s avoid-duplication
  rule, for no benefit — this project's tooling is already GitHub-native.
- Sub-issues (a GitHub feature, GA since January 2025) is a precise
  structural match for the feature→task hierarchy already decided —
  reusing it avoids inventing a parallel hierarchy scheme (e.g. labels or
  a naming convention) when GitHub already models this exact relationship
  natively, including automatic parent-progress rollup on sub-issue
  closure.
- Assignee-as-claim was verified, not assumed: it's both the standard
  sourced OSS anti-duplication convention and literally how GitHub's own
  Copilot coding agent (and comparable multi-agent tooling) is assigned
  parallel work today — reusing an existing, tool-supported mechanism
  rather than inventing a bespoke claim file or lock.
- Closing keywords + automatic parent rollup were chosen specifically to
  make status-keeping a side effect of actions an agent already takes
  (assign, merge) rather than an extra manual bookkeeping step — the same
  principle that ruled out commented-out code and duplicate documentation
  elsewhere in this project's conventions: state that must be manually
  kept in sync eventually drifts.
- No feature-level PR reuses the per-task PR gate already decided in
  `feature-definition-and-scoping.md`; a second, feature-level merge gate
  would be redundant against the already-established per-task one.
- The programmatic-mechanics section exists because the user's go-ahead on
  this whole decision was explicitly conditioned on agents being able to
  work with issues programmatically — this was verified against current
  GitHub CLI/REST API docs (not assumed), including the specific
  `id`-vs-`number` gotcha on the sub-issues endpoint, so a future
  implementing agent doesn't have to rediscover it.

## Sources

- [docs.github.com — adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues),
  [github.blog — introducing sub-issues](https://github.blog/engineering/architecture-optimization/introducing-sub-issues-enhancing-issue-management-on-github/) —
  sub-issues as a native GA feature, parent-issue progress auto-rollup.
- [docs.github.com — REST API endpoints for sub-issues](https://docs.github.com/en/rest/issues/sub-issues),
  [jessehouwing.net — create GitHub issue hierarchy using the API](https://jessehouwing.net/create-github-issue-hierarchy-using-the-api/) —
  the `POST .../sub_issues` endpoint and its `sub_issue_id`-wants-`id`-not-`number`
  behavior.
- [docs.github.com — linking a pull request to an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue) —
  closing keywords (`Closes #N`) and merge-triggered auto-close.
- [cli.github.com/manual/gh_issue_create](https://cli.github.com/manual/gh_issue_create),
  [cli.github.com/manual/gh_issue_edit](https://cli.github.com/manual/gh_issue_edit) —
  `gh issue create/edit --add-assignee`, `@me`/`@copilot` assignee shorthand.
- [github.blog — assigning and completing issues with coding agent in GitHub Copilot](https://github.blog/ai-and-ml/github-copilot/assigning-and-completing-issues-with-coding-agent-in-github-copilot/) —
  assigning an issue as the mechanism for handing parallel work to an AI
  coding agent.
