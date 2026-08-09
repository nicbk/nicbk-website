# Agent Guidelines

## Documentation hierarchy and limited context

An agent's context window is limited, and only a small fraction of it can be
used effectively before `context rot` degrades performance. Project
documentation therefore forms a linked hierarchy, rooted at
[index.md](./index.md), rather than one flat pile of docs.

- Start at `index.md` and follow links only into the documents relevant to
  the current task. Do not preemptively read the entire hierarchy.
- When adding documentation, place it at the appropriate level of the
  hierarchy (general/shared guidance higher up, specific/sub-application
  guidance lower down) and link it in from its parent so it is discoverable
  without requiring a full-project search.
- Keep individual documents focused so an agent can pull in only the context
  necessary for its particular task.

## Manage complexity through folder structure

No individual file or module — code or documentation — should be allowed to
grow too large or too complicated. Complexity should instead be distributed
out through the folder structure.

- When a file or module starts covering multiple distinct concerns, or grows
  large enough to hurt readability, split those concerns into their own
  files, or into a subfolder if a concern is itself complex enough to need
  further splitting.
- Prefer a folder of small, focused files (e.g. `topic/index.md` plus
  sibling files, or a module folder with one file per responsibility) over a
  single large file covering the same ground.
- This mirrors the reasoning in "Documentation hierarchy and limited
  context" above: a folder structure that guides where complexity lives
  makes it possible to pull in only the relevant piece instead of an entire
  large file.

## Re-verify knowledge after compaction

The user may choose to compact context at any time. When this happens, the
agent must detect whether compaction has occurred for any knowledge relevant
to the current task, and if so, refresh that knowledge rather than trust a
summary of it. A summary may not be good enough to do the relevant job.

- As soon as the agent detects that a compaction has occurred, it must
  immediately re-read [AGENTS.md](./AGENTS.md) and [index.md](./index.md) from
  file, and then re-read all associated and informative documentation relevant
  to the current task (following the links from those roots into the specific
  documents the task depends on).
- If the knowledge came from a project document, re-read that document.
- If the knowledge came from the web, search the web again.
- Do this before relying on the knowledge to plan or execute — do not assume
  a post-compaction summary is a sufficient substitute for the original
  source.

## Research over recall

Whenever an agent needs to learn about something — during research, planning,
or implementation — the agent must search the web instead of relying on its
built-in/training knowledge. Built-in knowledge may be stale or wrong
(library APIs, framework versions, best practices, etc. change over time).
Always verify against current sources before acting on it.

## Read files explicitly, don't assume

Whenever the user asks the agent to read a file (or files), the agent must
actually read the file's contents with a tool rather than rely on
assumptions, memory, or a prior summary of what the file contains.

- This applies even if the agent believes it already knows the file's
  contents from earlier in the conversation — the file may have changed, or
  the prior knowledge may be incomplete or summarized (see "Re-verify
  knowledge after compaction" above for the compaction-specific case).
- Only after reading should the agent reason about or act on the file's
  contents.

## Build on what already exists and is already decided

Before writing new code or docs, work out how the change fits what the
project has already established — both the decisions recorded in the research
hierarchy and the code already in the tree — and build on that foundation
rather than beside it.

- Reuse or extend existing logic, components, and content instead of writing
  a parallel version. Duplication is not merely wasteful: a second
  implementation of something is where the two copies drift out of sync. This
  applies across all sub-applications sharing this project's infrastructure,
  not just within a single sub-app.
- Treat recorded decisions as binding constraints on implementation, not
  background reading. When a foundation has been chosen (a library, a
  pattern, a convention), build the feature on it; do not quietly hand-roll
  an alternative beside it. Doing so fragments the codebase into
  built-from-scratch and adopted-foundation halves that have to be reconciled
  later, and it silently discards the reasoning the decision was made for.
- When the established foundation genuinely does not fit the task, that is a
  decision to raise and re-decide with the user (see "Discuss before
  executing"), not to route around silently.

## Code readability and documentation

All code must be highly readable to a human and well documented.

- Favor clear, explicit code over clever or terse constructs, even when a
  more compact alternative exists.
- Document non-obvious logic, intent, and reasoning (comments, docstrings)
  so a future reader — human or agent — doesn't have to reverse-engineer it.
- When choosing between technologies/approaches, weigh their effect on
  code readability and maintainability as an explicit factor, not just
  functionality or popularity.

## Discuss before executing

Whenever the user asks the agent to discuss research or planning, the agent
should discuss the topic with the user and wait for the user to explicitly
tell it to execute before acting on a plan. Do not jump ahead to
implementation during a research/planning discussion.

## Design UI that is simple and pleasant to use

Every user-facing feature must be *designed*, not merely assembled. Meeting the
written requirements is the floor, not the goal: an interface that does
everything the spec asks and is confusing, cluttered, or awkward to operate has
failed. Aim for the simplest arrangement that does the job, and hold the result
to established UI/UX principles rather than to personal taste — the ones below
are the ones this project keeps needing.

- **Design for the content that will really be there, not the least of it.**
  The commonest failure by far. A layout built against two short tags and a
  three-word title breaks the moment it meets thirty tags and a full paper
  title. Before building, decide what happens at empty, at typical, and at
  *much more than expected* — long strings, many items, missing fields — and
  make the layout hold in all three. If a realistic amount of content deforms
  the page, the design is wrong even though every test passes.
- **Establish a visual hierarchy and respect it.** Decide what the most
  important thing on a surface is, and make sure nothing secondary outweighs
  it. Borders, fills, and weight are loud; use them on what matters. A status
  indicator that draws the eye before the title it belongs to is a hierarchy
  inverted, no matter how correct its data.
- **Prefer removing to adding.** Fewer elements, fewer steps, fewer decisions
  asked of the reader. When a surface needs something new, first ask what it
  can stop doing. Two ways to reach the same outcome is usually one too many.
- **Keep primary actions reachable without hunting.** Nothing a user does often
  should sit behind scrolling, behind a hover, or at the end of a list that
  grows. Controls that stay put while their content scrolls are worth the extra
  markup.
- **Match the primitive to the interaction, not to the plan.** A component named
  in a task's plan is a starting suggestion, and plans are written before the
  interaction is understood. If the right behavior fights the chosen primitive —
  a role's semantics, its keyboard model, its scrolling — that is evidence the
  primitive is wrong, not that the behavior should be compromised. Raise it and
  change it (see "Build on what already exists and is already decided" for when
  the deviation needs re-deciding with the user).
- **Uniform things should look uniform.** Repeated elements — cards in a grid,
  rows in a list — should share size, spacing, and alignment unless a difference
  carries meaning. Ragged repetition reads as a rendering fault.
- **Make it pleasant, not merely possible.** Predictable behavior, no dead ends,
  no surprise motion, and the shortest path through the common case. Ask what
  the interaction feels like on the tenth use, not the first.

These are design decisions, so they are subject to the same rules as any other:
they build on what `research/ui-ux/` has already decided, and a genuine conflict
with a decided document is raised with the user rather than resolved silently.

## Verify features against their intent, in the browser

Every visual/interactive feature must be verified against what it is actually
for — the experience it is meant to deliver and the reference it is meant to
match — by exercising it in Chrome the way a user would. "It renders without
errors" is not verification; it is the absence of one failure mode. Decide up
front what success looks like (the intended behavior, plus the mockup or spec
if one exists) and check the running feature against *that*, rather than
accepting any plausible-looking result. This cannot be inferred from the code,
the unit/e2e tests, or a screenshot taken once at a single size; automated
tests and manual viewing are complementary — the tests guard against
regressions, but only exercising the real page catches layout, spacing,
overflow, and interaction problems.

- **Check the design, not only the behavior.** The section above is the
  checklist: is the hierarchy right, does it hold at realistic content volumes,
  is the common action reachable without hunting? **Seed the page with enough
  content to find out** — a surface viewed only with the two rows that happen to
  be in the database has not been checked at all.
- **Compare against the reference.** When the feature has a mockup or written
  spec, put the running feature next to it and confirm it matches — the style,
  the layout, the affordances — instead of settling for something that merely
  looks reasonable on its own.
- **Exercise the actual intent, not just the render.** Interact the way the
  feature's purpose demands: if it is meant to respond live, act continuously
  and watch it respond mid-interaction; if it must keep focus or preserve
  state, drive it hard enough to expose the regression. Click links and
  controls, toggle state, follow navigation — don't stop at the initial paint.
- Load the affected page(s) and look at everything the change touches,
  **scrolling through the whole page** so nothing below the fold is missed
  (off-screen content is where overflow and layout breakage tend to hide).
- Check the feature across the range of conditions it must support: both light
  and dark themes, and a spread of browser widths (narrow/mobile, mid, and
  wide) for anything responsive. Layout bugs are frequently width-dependent
  and invisible at the one size you happened to test.
- When viewing surfaces a problem, fix it and re-view to confirm, and add or
  extend an automated test that locks the fix in.

## Fix recurring mistakes at the level of the principle

When a mistake — especially a repeated one — reveals a gap in this guidance,
close the gap with the general principle behind it, not a rule naming the
specific instance. A guideline that enumerates "remember to do X for feature
Y" ages badly and misses the next variation; the durable fix names the
underlying reason the mistake was possible, so it also covers cases nobody has
hit yet. The two sections above were strengthened, and this one added, out of
exactly such a review.
