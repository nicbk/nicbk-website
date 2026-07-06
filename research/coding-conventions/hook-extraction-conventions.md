# Hook Extraction Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

When a piece of logic warrants becoming a custom `useX` hook vs. staying
inline in a component. Naming itself (`use` prefix, camelCase) is already
covered by [naming-and-casing.md](./naming-and-casing.md); this is about
when to extract one at all.

## Decision

**Extraction for readability alone (no reuse) is allowed, not just
extraction for reuse.** The already-decided colocate-first/promote-on-2nd-
consumer rule (from
[file-hierarchy-and-complexity.md](./file-hierarchy-and-complexity.md))
still governs *reused* logic, but a hook used by exactly one component can
still be worth extracting if doing so genuinely shrinks/declutters that
component and gives the behavior an explicit, named concern — this is not
premature abstraction as long as it's driven by a real readability win, not
extraction for its own sake.

**No numeric threshold** (no "extract past N `useState` calls" rule) — the
criterion is qualitative: extract when it meaningfully reduces the
component's size/cognitive load; leave logic inline when it's small enough
that jumping to another file to understand it would cost more than it
saves.

**Bundling multiple hooks (built-in, library, or custom) into one cohesive
custom hook is good practice**, not harmful indirection — e.g. combining
TanStack Router's `useSearch()` with a local `useState` toggle into one
`useArticleFilters()`-style hook when they serve one cohesive concern. A
custom hook is an explicit function call returning explicit named values,
unlike older indirection-heavy patterns (HOCs, render props).

**Only name something `useX` if it actually calls React hooks internally**
(or clearly will soon) — a function with no hook calls is a plain function,
not a `useX` hook, regardless of how "hook-like" its purpose feels. The
`use` prefix is a signal to callers that state/effects may be involved
(and that the Rules of Hooks apply); misapplying it to a hook-free function
breaks that signal.

**Return shape:** a tuple (`[value, setValue]`) only for simple 2-value
getter/setter-style pairs mimicking `useState`; an object
(`{ value, setValue, error }`) for anything with 3+ values, or where
positional order isn't self-evident. Objects also let fields be added later
without a breaking change to call sites, which a tuple's positional nature
doesn't allow.

## Reasoning

- Allowing readability-driven extraction (not just reuse-driven) reflects
  that a hook's value isn't only deduplication — naming a cohesive concern
  and shortening a component body are real, independent benefits, as long
  as the extraction isn't done just "to look sophisticated" (a cited
  anti-pattern where a reader now has to open multiple files to follow
  something trivial).
- No numeric heuristic was adopted because none was found in current
  guidance — qualitative judgment (does this actually help a reader?) is
  the only criterion that generalizes across cases without becoming an
  arbitrary rule.
- The `useX`-requires-hooks-internally rule is taken directly from React's
  own documentation, not inferred — it's a correctness signal
  (Rules of Hooks applicability), not a style preference, so there's no
  tradeoff to weigh here.
- The tuple-vs-object return-shape split mirrors `useState`'s own
  convention for the tuple case (familiar, minimal syntax for a getter/
  setter pair) while avoiding the real cost tuples have for anything larger
  (silent breaking changes when a new value is added, no self-documenting
  field names at the call site).

## Sources

- [chakshunyu.com — a readability analysis of implementing custom hooks](https://www.chakshunyu.com/blog/react-readability-analysis-of-implementing-custom-hooks/) —
  extraction-for-readability as a legitimate goal, the "extracting to look
  sophisticated" anti-pattern, bundling multiple hooks into one cohesive
  hook.
- [thelinuxcode.com — React custom hooks in 2026](https://thelinuxcode.com/react-custom-hooks-in-2026-a-practical-guide-to-cleaner-components-fewer-bugs-and-faster-product-delivery/) —
  qualitative (not numeric) extraction criteria.
- [react.dev/learn/reusing-logic-with-custom-hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) —
  official guidance: only prefix `useX` if hooks are actually called
  internally (now or planned).
- [fettblog.eu — typing custom hooks with tuples](https://fettblog.eu/typescript-react-typeing-custom-hooks/),
  [tinytip.co — hooks should return named tuples](https://tinytip.co/tips/react-hook-tuple/) —
  tuple-vs-object return-shape guidance, breaking-change risk of tuples for
  larger return values.
