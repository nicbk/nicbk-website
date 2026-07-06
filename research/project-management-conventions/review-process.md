# Review Process

Researched: 2026-07-04. Decided: 2026-07-04.

What gates a task's merge, in what order, and what each gate must verify —
sitting on top of the per-task PR gate already decided in
[feature-definition-and-scoping.md](./feature-definition-and-scoping.md)
and [issue-and-pr-lifecycle.md](./issue-and-pr-lifecycle.md). Stated in
terms of required capabilities, not any one harness's specific tooling, so
it stays valid if the agent harness implementing it changes.

## Decision

**Three sequential gates**, each required before the next, and the entire
sequence required before the next task in a feature can start (per the
gate already decided):

1. **Agent self-review**, before the PR is even opened — a mandatory step
   of finishing a task, not an optional extra. It requires three
   capabilities, regardless of which harness provides them:
   - **Behavioral verification**: exercising the change end-to-end and
     observing actual behavior, not just relying on automated tests or a
     typecheck passing.
   - **Correctness and simplification/efficiency self-review**: a critical
     re-read of the diff for bugs and unnecessary complexity, at a depth
     scaled to stakes — tasks touching shared infrastructure,
     authentication, or public-facing surface warrant deeper, multi-pass
     (or multi-agent, where supported) review.
   - **Security-focused review** for anything touching authentication,
     user data, or external input handling.
2. **Automated CI/CD** (mechanics owed to
   [../devops-deployment/index.md](../devops-deployment/index.md), not yet
   researched, but the requirement stands regardless of when that's
   decided): lint/format, typecheck, the full test suite from the task's
   `testing.md` (mechanics owed to
   [../testing-qa/index.md](../testing-qa/index.md), also not yet
   researched), and security/static scanning. A red run blocks the PR
   outright — no human review happens on a failing PR.
3. **Manual human review**, only once gates 1–2 are green. This gate is
   deliberately not automated: it's reserved for what tooling can't reliably
   judge — whether the change matches the *intent* behind the task's
   `constraints-and-behavior.md` (not just its literal wording), and its
   fit with the broader architecture.

**Definition of Done for a task** — everything above collectively verifies:

- Functional match to `constraints-and-behavior.md` (acceptance criteria).
- `testing.md`'s requirements implemented and passing in CI (quality —
  Definition of Done proper, distinct from acceptance criteria).
- Traces to the citations in the parent feature's `research.md` — no
  undecided-research improvisation introduced along the way.
- No regressions elsewhere (the full suite running in CI, not just new
  tests written for this task).
- Follows the already-decided `coding-conventions/` — mostly enforced
  automatically (Biome, etc. in CI), with the human reviewer as backstop
  for anything a linter can't catch (e.g. whether a comment actually
  explains "why").

**Definition of Done for a feature** is a rollup, not a separate checklist:
done when every one of its tasks has cleared all three gates and merged —
which, per `issue-and-pr-lifecycle.md`, is exactly what auto-closes the
parent feature issue. No additional feature-level review step, consistent
with the already-decided absence of a feature-level PR.

**Current-tooling note (not part of the decision itself):** as of
2026-07-04, this project's current harness (Claude Code) happens to provide
ready-made implementations of Gate 1's three capabilities: `/verify`
(behavioral verification), `/code-review` — including a deeper `ultra`
multi-agent mode for higher-stakes tasks — (correctness/simplification
self-review), and `/security-review` (security-focused review). If the
harness changes, Gate 1's *requirements* still apply; whatever replaces
these tools must satisfy the same three capabilities.

## Reasoning

- The three-gate order (self-review → automated CI/CD → human review) is
  the sourced 2026 hybrid-review consensus: automated gates for what
  tooling verifies reliably, a human-owned checkpoint reserved for
  judgment calls automation can't make (intent-match, architectural fit) —
  neither pure-automation nor pure-human review.
- Gate 1 is stated as required *capabilities* rather than named tools
  specifically because those capabilities need to outlive any one coding
  harness — a decided research doc that hard-codes a specific harness's
  slash commands would need to be rewritten the moment the harness changes,
  which is exactly the kind of churn this documentation hierarchy is meant
  to avoid. The current-tooling note keeps today's concrete implementation
  visible without making it load-bearing.
- Separating Definition of Done (quality, applies uniformly to every task)
  from acceptance criteria (functional, per-task —
  already `constraints-and-behavior.md`) is the sourced Scrum distinction;
  it means every task's `constraints-and-behavior.md` only needs to state
  what's specific to that task, not re-state universal quality bars like
  "tests must pass" on every single task.
- No additional feature-level review reuses the no-feature-level-PR
  decision already made in `feature-definition-and-scoping.md` — adding one
  here would contradict it.

## Sources

- [github.blog — agent pull requests are everywhere, here's how to review them](https://github.blog/ai-and-ml/generative-ai/agent-pull-requests-are-everywhere-heres-how-to-review-them/) —
  self-reviewing agent evaluating its own draft PR before human review.
- [augmentcode.com — AI code review in CI/CD pipelines](https://www.augmentcode.com/guides/ai-code-review-ci-cd-pipeline) —
  CI as the gate for lint/typecheck/tests/security scanning; AI suggestions
  must survive the same pipeline as human-written code.
- [dualmedia.com — AI code review, can agents replace human reviewers?](https://www.dualmedia.com/ai-code-review/),
  [the-ai-corner.com — AI code review checklist 2026](https://www.the-ai-corner.com/p/ai-code-review-checklist-2026-failure-modes-prompts) —
  the hybrid model: human-owned gate kept for architecture, security-
  sensitive code, and public APIs; AI flags defects, humans retain final
  approval.
- [atlassian.com — Definition of Done](https://www.atlassian.com/agile/project-management/definition-of-done),
  [altexsoft.com — Definition of Done vs. Acceptance Criteria](https://www.altexsoft.com/blog/acceptance-criteria-definition-of-done/) —
  DoD as uniform quality criteria distinct from per-story/task functional
  acceptance criteria.
