# Code Comments

Researched: 2026-07-04. Decided: 2026-07-04.

In-code comment and docstring conventions — when to write a comment at all,
which comment syntax to use for what, and TODO formatting. Distinct from
[../documentation-content-conventions/index.md](../documentation-content-conventions/index.md),
which covers docs content and MDX blog posts, not code comments.

## Decision

**Comments explain "why," not "what."** Code already shows what it does;
a comment is only worth writing when it captures something the code can't:
non-obvious reasoning, a tradeoff between alternatives, a constraint imposed
from outside the function (a library quirk, a spec requirement), or a
workaround for a specific bug. If deleting a comment wouldn't leave a future
reader confused, it shouldn't have been written. This is the same principle
already stated generally in [AGENTS.md](../../AGENTS.md)'s "Code readability
and documentation" section — this doc makes it concrete for comments
specifically.

**Two-tier syntax split, no overlap:**

- `/** ... */` (TSDoc) is reserved *exclusively* for tool-readable API
  documentation — the kind a consumer of the code, or an IDE tooltip, should
  read. Never use it for an implementation aside.
- `//` is used for everything else, including multi-line implementation
  notes (as consecutive `//` lines, not a `/* */` block). `/* */` is never
  used for non-doc comments — reserving it purely for TSDoc keeps the
  syntax itself an unambiguous signal of "this is documentation" vs. "this
  is an implementation note."

**TSDoc is required on every exported function, hook, and component** (i.e.
anything crossing a module boundary) whose behavior isn't fully self-evident
from its name and TypeScript types. It's optional on non-exported/internal
helpers, using the same bar AGENTS.md already sets: document it if its
purpose isn't obvious from the name, skip it otherwise. TSDoc omits type
annotations (redundant with the TS signature) and doesn't restate the
parameter or prop name — it describes behavior, intent, or a caveat instead.

**No bare comments inside JSX children.** A `//` or unwrapped comment placed
directly in JSX renders as literal text (or breaks compilation) instead of
being treated as a comment. If an explanation is genuinely needed at that
spot, wrap it as `{/* ... */}` — but prefer moving the explanation above the
JSX return, or onto the hook/handler it actually concerns, over commenting
inline.

**No commented-out code.** Delete it. Git history is the record of what used
to be there and why it was removed; a commented-out block left in place
signals "this might still matter" and makes future readers hesitant to
delete it, even when it's pure clutter.

**TODOs use `// TODO(#issue): description`**, referencing an issue number
from the start. This presumes an actual issue tracker, which
[project-management-conventions/index.md](../project-management-conventions/index.md)
(not yet researched) still needs to decide concretely — but the comment
*format* itself is fixed now so it doesn't need to change later once that
tracker is chosen.

## Reasoning

- The why-not-what framing is the one point of near-universal agreement
  across every source found: code communicates *what*/*how* on its own,
  comments earn their keep only by adding what the code structurally can't
  — the reasoning behind a choice, not a restatement of it.
- The `/** */`-for-TSDoc-only / `//`-for-everything-else split comes directly
  from the Google TypeScript style guide, which draws the line on exactly
  this axis: JSDoc/TSDoc is understood by tooling (editors, doc generators)
  and meant for *users* of the code, while ordinary `//` comments are for
  other humans reading the implementation. Keeping `/* */` fully out of the
  non-doc case removes any ambiguity about which kind of comment a reader is
  looking at.
- Requiring TSDoc at the export boundary (not universally) mirrors the
  Google guide's own rule ("TSDoc is expected for all public properties of
  classes, and for all exported functions") while keeping the same
  qualitative, non-exported bar AGENTS.md already set elsewhere in this
  project (see [hook-extraction-conventions.md](./hook-extraction-conventions.md)
  for the same reasoning applied to a different question) — avoiding a
  second, redundant threshold rule.
- Omitting types and param-name restatement from TSDoc is a direct,
  sourced rule (Google style guide): the type is already in the code, so
  repeating it in prose is guaranteed to drift out of sync eventually.
- The JSX-comment rule is a correctness fact, not a style preference — a
  bare comment in JSX children is either rendered literally or a syntax
  error, so this isn't a tradeoff to weigh.
- No-commented-out-code was cited independently across multiple sources as
  a recognized anti-pattern, for the same reason each time: it creates an
  artifact nobody feels safe deleting, which is exactly what version control
  already exists to make unnecessary.
- The TODO format was an explicit user tie-break: research surfaced the
  lightweight `// TODO: description` (no ticket) as the simpler near-term
  option, but the user chose to fix the issue-referencing format
  (`TODO(#issue):`) now rather than defer it, accepting that it presumes an
  issue tracker whose specifics are still owed to
  [project-management-conventions/index.md](../project-management-conventions/index.md).

## Sources

- [google.github.io/styleguide/tsguide.html](https://google.github.io/styleguide/tsguide.html) —
  the `/** JSDoc */`-for-tooling vs. `//`-for-implementation split, TSDoc
  required for all exported functions/public class members, omitting types
  and param-name restatement from TSDoc, the `TODO(issue):` format.
- [medium.com/kristiyan-velkov — golden rules for code comments](https://medium.com/kristiyan-velkov/my-golden-rules-for-code-comments-in-typescript-and-javascript-84e95f1eb1d7) —
  why-not-what framing, TODO-for-incomplete-work usage, no commented-out
  code.
- [blog.codinghorror.com — code tells you how, comments tell you why](https://blog.codinghorror.com/code-tells-you-how-comments-tell-you-why/),
  [blog.hostilefork.com — what vs. why in commenting](http://blog.hostilefork.com/what-vs-why-in-commenting/) —
  independent sourcing for the why-not-what philosophy.
- [tsdoc.org](https://tsdoc.org/), [github.com/microsoft/tsdoc](https://github.com/microsoft/tsdoc) —
  TSDoc as the standardized doc-comment syntax TypeScript tooling expects.
- Biome's [`noCommentText`](https://biomejs.dev/linter/rules/no-comment-text/) rule —
  confirms bare comments inside JSX children are flagged/incorrect, backing
  the `{/* ... */}`-or-move-it-out rule.
