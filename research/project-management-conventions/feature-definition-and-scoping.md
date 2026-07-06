# Feature Definition and Scoping

Researched: 2026-07-04. Decided: 2026-07-04.

What counts as one "feature" (a unit of work), how it's sized, the concrete
folder structure that holds it, and the traceability requirement back to
already-decided [../index.md](../index.md) research docs and
[../../high-level-guidance/design/](../../high-level-guidance/design/)
constraints. This is the foundation the other five topics in this category
build on: [issue-and-pr-lifecycle.md](./issue-and-pr-lifecycle.md) and
[review-process.md](./review-process.md) both finalize workflow details
this doc only states as constraints (issue/PR mapping, CI/CD gating).

## Decision

**A feature is one vertical slice** — a complete, independently
testable/demoable unit of user-visible behavior, touching every layer it
needs (UI, server, data) to actually work end-to-end. A horizontal slice
(just a migration, just an API route, with nothing usable on top) is not a
feature by itself.

**Sizing follows INVEST** (Independent, Negotiable, Valuable, Estimable,
Small, Testable), with "Independent" sharpened for this project's
multi-agent reality: a feature should be small and self-contained enough
that one agent can carry it through without its file footprint colliding
with another concurrently-active feature (mechanics of that finalized in
[branching-and-parallel-agent-strategy.md](./branching-and-parallel-agent-strategy.md)).

**Every feature is a folder, and every feature always has at least one
task** — there is no flat/task-less feature, even a trivially small one.
Structure, at repo root:

```
features/
  <feature-slug>/
    plan.md                    # approach, and the task breakdown/sequence
    description.md             # what the feature is, at a glance
    constraints-and-behavior.md  # well-defined expected behavior / acceptance criteria
    testing.md                 # testing requirements for the feature as a whole
    status.md                  # current state of the feature
    research.md                # citations into research/*.md, plus any
                                # research too narrow for the global hierarchy
    tasks/
      <task-slug>/
        description.md             # exactly what this task does — concrete, specific
        constraints-and-behavior.md  # exactly which acceptance criteria this task satisfies
        testing.md                 # exactly what this task's tests must cover
        status.md                  # this task's state (tracks its PR/CI/review gate)
        research.md                 # only if needed beyond the parent feature's research.md
```

`features/` lives at the project root, a sibling of `src/`, `research/`, and
`high-level-guidance/` — it is live operational state (what's being built,
right now), not a research artifact, so it doesn't belong under `research/`.
Feature- and task-slug folder names follow the kebab-case convention already
decided in
[../coding-conventions/naming-and-casing.md](../coding-conventions/naming-and-casing.md).

A task's four content files must be concrete and specific to that task, not
a copy-paste of the parent feature's — e.g. a task's
`constraints-and-behavior.md` states exactly which of the feature's
acceptance criteria this particular task satisfies, not the feature's full
criteria set restated. This keeps each task independently checkable: an
agent (or reviewer) should be able to read one task's four files and know
exactly what "done" means for that task alone, without having to
re-derive it from the feature's broader files.

**Traceability is mandatory.** A feature's `research.md` must cite the
specific decided `research/*.md` doc(s) and
`high-level-guidance/design/*.md` line(s) it implements. If implementing a
feature would require a decision that hasn't actually been made yet in
`research/`, that gap is resolved — discussed and decided — before
implementation starts, not improvised inline during the feature's own
implementation.

**Per-task PR gating** (stated here as a constraint on feature/task
structure; the issue/PR mechanics and CI/review mechanics themselves are
decided in [issue-and-pr-lifecycle.md](./issue-and-pr-lifecycle.md) and
[review-process.md](./review-process.md)): an agent implements one task at
a time. Only once that task's implementation satisfies its
`constraints-and-behavior.md` with adequate passing tests (per its
`testing.md` — the concrete testing bar itself is owed to
`testing-qa/`, not yet researched, but the requirement that every feature
and task be rigorously tested applies regardless of when that category is
researched) does the agent open a PR for that task specifically. That PR
must pass CI/CD (mechanics owed to `devops-deployment/`, not yet researched)
and get manual human review before the agent proceeds to the next task in
that feature's sequence.

## Reasoning

- The vertical-slice definition and INVEST sizing criteria are the two most
  consistently-cited standards for scoping a unit of work across current
  agile/product-delivery sources — chosen over inventing project-specific
  sizing language because they're well-understood and already answer the
  "how small is too small / how big is too big" question without a new
  bespoke rule.
- Sharpening INVEST's "Independent" around file-footprint collision (rather
  than just "no blocking dependency on another story," its usual meaning)
  is a project-specific adaptation: this project's units of work are
  implemented by agents running genuinely in parallel, each isolated in its
  own worktree, so a merge conflict is a real, immediate cost in a way it
  usually isn't for a human team working one story at a time.
- The specify → plan → tasks → implement shape (feature-level plan feeding
  a concrete task breakdown) mirrors GitHub's Spec Kit — the closest
  existing real-world analog to what this project already does informally
  via `research/` decisions feeding `high-level-guidance/design/` feeding
  implementation. Adopting its shape (rather than a from-scratch scheme)
  reuses a pattern already validated for exactly this
  agent-driven-development context.
- The mandatory `research.md` traceability requirement is a direct
  application of what current sourcing calls "requirements as code" —
  treating settled decisions as things an agent must cite before generating
  changes, rather than something it can quietly route around or
  reinterpret. It also directly enforces
  [AGENTS.md](../../AGENTS.md)'s existing "avoid duplication" and
  "discuss before executing" rules at the feature level: a feature can't
  paper over a missing decision by improvising one inline.
- The folder hierarchy (`features/<slug>/` always containing `tasks/`, even
  for a single-task feature), the exact six feature-level files, the
  four-file task subset, and the per-task PR/CI/human-review gate before
  advancing to the next task are explicit user decisions, not derived from
  a single external source — no source combines "hierarchical folder
  tracking + mandatory tasks + per-task PR gating" as one named convention.
  They were adopted as stated because they directly serve this project's
  specific constraint (multiple simultaneous agents needing an
  unambiguous, file-visible record of exactly what's in flight, at what
  granularity, and what gate it's waiting on) better than adapting any one
  single external framework wholesale would have.
- Always requiring at least one task per feature (never a flat, task-less
  feature) keeps the per-task PR/CI/review gate a single, exceptionless
  rule — there's no second, feature-level PR path to keep in sync with the
  task-level one.

## Sources

- [monday.com — vertical slice explained for 2026](https://monday.com/blog/rnd/vertical-slice/),
  [zenhub.com — vertical slicing for cross-functional work](https://www.zenhub.com/blog-posts/vertical-slicing-for-cross-functional-team) —
  vertical-slice definition: a feature spans all technical layers and
  delivers working, demoable functionality.
- [towerhousestudio.com](https://towerhousestudio.com/blog/how-to-evaluate-your-user-stories-using-the-invest-criteria/),
  [blog.logrocket.com — INVEST principle](https://blog.logrocket.com/product-management/writing-meaningful-user-stories-invest-principle/) —
  the INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small,
  Testable) for sizing a unit of work.
- [github.com/github/spec-kit](https://github.com/github/spec-kit),
  [github.blog — spec-driven development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) —
  the specify → plan → tasks → implement workflow per feature, and marking
  tasks that can run in parallel.
- [webpronews.com — requirements as code](https://www.webpronews.com/requirements-as-code-emerges-to-ground-ai-coding-agents-in-team-decisions/),
  [arxiv.org/html/2602.00180v1 — spec-driven development](https://arxiv.org/html/2602.00180v1) —
  treating settled requirements/decisions as artifacts agents must cite
  before generating changes; traceability across requirements → design →
  implementation → tests as a core AI-driven-development requirement.
