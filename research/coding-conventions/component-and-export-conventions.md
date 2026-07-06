# Component and Export Conventions

Researched: 2026-07-04. Decided: 2026-07-04.

Component structure, prop-typing conventions, and export style.

## Decision

**Exports: named exports only, no default exports.** Every component,
hook, and utility is exported by name. This isn't just style — React Fast
Refresh (HMR) requires named, non-anonymous exports to reliably preserve
component state across edits; anonymous default exports break this. It's
also already consistent with TanStack Router's own file-based routing
convention, where every route file exports a named `Route` constant
(`export const Route = createFileRoute(...)`), never a default export.
Enforced via Biome's `noDefaultExport` lint rule.

**Component definition: function declarations**, not arrow functions
(`function Foo(props: FooProps) { ... }`, not
`const Foo = (props: FooProps) => { ... }`). No functional difference
between the two — chosen purely for consistency, enforced via Biome's
`useReactFunctionComponentDefinition` rule configured to this style.

**Props typing: always a named `FooProps` interface** directly above the
component, destructured in the function signature
(`function Foo({ bar }: FooProps)`), even for single-prop components — no
inline anonymous prop types, for consistency across the codebase. Default
values are assigned via destructuring defaults
(`{ optionalNumber = 42 }: FooProps`), not `defaultProps` (unsupported on
function components as of React 19).

**Within-file ordering**, top to bottom:

1. `FooProps` interface (and any other component-local types).
2. The component function itself, internally ordered as:
   1. Hooks (state, context, and other hook calls, including any custom
      hooks).
   2. Derived values / computed variables.
   3. Event handlers and other non-render helper functions.
   4. Early returns (loading/error/empty states).
   5. The main render/JSX return.
3. Any small, tightly-coupled sub-components used only by this file's main
   component may live in the same file, below it — a hard one-component-
   per-file rule is not required.

## Reasoning

- Named-exports-only was chosen because it's a functional requirement (Fast
  Refresh reliability), not just a style preference — there's no real
  tradeoff to weigh, and it aligns with a convention the project's router
  already imposes on route files.
- Function declarations over arrow functions is an explicit tie-break on a
  question research found genuinely unsettled industry-wide (Biome itself
  added a rule specifically to let teams enforce either consistently, not
  favoring one) — picked for hoisting and slightly clearer stack traces,
  but this is a consistency choice, not a correctness one.
- Always using a named `FooProps` interface (rather than a prop-count-based
  threshold) avoids a fuzzy, hard-to-enforce rule — research found no
  sourced consensus on where an inline-vs-named cutoff should sit, so a
  single consistent rule is simpler than approximating one.
- The within-file ordering convention was defined despite no strong sourced
  industry consensus, per explicit user preference for upfront consistency;
  the specific order (types → hooks → derived values → handlers → early
  returns → render) follows the natural top-to-bottom data flow through a
  component and is a common pattern seen informally across component
  libraries, even without one canonical source mandating it.
- Allowing small tightly-coupled sub-components in the same file (rather
  than forcing one-component-per-file) reflects that no source found this
  to be a real constraint — colocation of genuinely coupled code is more
  readable than forced file-splitting.

## Sources

- [biomejs.dev/linter/rules/no-default-export](https://biomejs.dev/linter/rules/no-default-export/) —
  Biome's rationale for discouraging default exports (discoverability,
  naming consistency).
- [npmjs.com/package/eslint-plugin-react-refresh](https://www.npmjs.com/package/eslint-plugin-react-refresh) —
  React Fast Refresh's requirement for named, non-anonymous component
  exports.
- [tanstack.com/router/latest/docs/api/file-based-routing](https://tanstack.com/router/latest/docs/api/file-based-routing) —
  TanStack Router's own named-export-only route file convention.
- [react-typescript-cheatsheet.netlify.app — default props](https://react-typescript-cheatsheet.netlify.app/docs/basic/getting-started/default_props/),
  [dev.to/bytebodger — default props in React TypeScript](https://dev.to/bytebodger/default-props-in-react-typescript-2o5o) —
  named `FooProps` interface convention, destructuring defaults over
  deprecated `defaultProps`.
- Biome's `useReactFunctionComponentDefinition` (nursery) rule — lets a
  team enforce either function-declaration or arrow-function component
  style consistently; confirms no universal 2026 default exists.
- [robinwieruch.de/react-folder-structure](https://www.robinwieruch.de/react-folder-structure/),
  [joshwcomeau.com/react/file-structure](https://www.joshwcomeau.com/react/file-structure/) —
  colocation principle, no hard one-component-per-file rule.
