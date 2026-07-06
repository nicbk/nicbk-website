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

## Avoid duplication

Agents must prevent duplication wherever possible, in both code and
documentation. Before adding new code or docs, check whether equivalent
logic, components, or content already exist elsewhere in the project and
reuse/extend them instead of writing something new. This applies across all
sub-applications sharing this project's infrastructure, not just within a
single sub-app.

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
