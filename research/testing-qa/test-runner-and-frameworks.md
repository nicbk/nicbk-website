# Test Runner and Frameworks

Researched: 2026-07-05. Decided: 2026-07-05.

Unit/component test runner, component-testing library, and mocking/
assertion tooling for the TanStack Start app decided in
[../technologies/frontend-framework.md](../technologies/frontend-framework.md).
Scoped to what's testable in isolation — testing against a real Postgres/
Zero stack is deferred to
[integration-testing-strategy.md](./integration-testing-strategy.md) (not
yet researched).

## Decision

### Test runner: Vitest

**Vitest**, not Jest. It's Vite-native — reuses the project's existing
`vite.config.ts`, plugins, and path aliases directly, versus Jest needing a
separate transform pipeline (babel/ts-jest) to approximate what Vite
already does for the app itself. Multiple current sources report 5–28x
faster watch-mode/cold-start versus Jest on comparable suites, and
TanStack's own router docs endorse Vitest as the primary choice (Jest is
listed only as a fallback alternative). Both are MIT-licensed — no
licensing concern either way. Jest's remaining edge cases (React Native,
very large legacy CommonJS monorepos, massive `--shard`-scale suites) don't
apply to this project's single-package TanStack Start app.

### Component testing: `@testing-library/react` + jsdom

Standard, uncontested pairing with Vitest: `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event`, with `jsdom`
as the test environment.

### Mocking/assertions: built into Vitest, no separate library

`vi.mock`/`vi.fn`/`vi.spyOn` plus a Jest-API-compatible `expect` ship with
Vitest directly — no separate mocking library is needed for general JS/TS
mocking.

### The TanStack Start testing gap, and how this project handles it

TanStack Start has **no official testing guidance** as of this research
(confirmed via TanStack's own docs and multiple community
posts/discussions explicitly saying so). Two concrete consequences:

- **Route components** using `useRouter()`, `Link`, `Route.useLoaderData()`,
  etc. don't work in isolation. The community pattern is manually mocking
  these hooks/components (e.g. `Link` → a plain `<a>`) — workable, but
  TanStack's own team doesn't present it as settled best practice.
- **Server functions (`createServerFn`)** are the harder case: the
  community workaround mocks `createServerFn` itself via `vi.mock` to strip
  Start's compile-time "use server" handling and call the handler directly
  — but this breaks down for server functions that call *other* compiled
  server functions, and doesn't apply global middleware. Multiple
  contributors flag this as a genuine, unresolved framework/DX gap, not a
  solved problem.
- The same gap exists for **Zero's `useQuery` hook** — no official
  unit-testing guidance was found for mocking it in isolation either.

**Decision: thin-wrapper convention.** Rather than accept the
`createServerFn`-mocking workaround's caveats (broken nested calls, skipped
middleware), `createServerFn` bodies stay minimal pass-throughs to plain,
exported functions containing the actual logic — those plain functions are
what gets unit-tested directly, sidestepping the mocking gap entirely
rather than working around it. Route components and `useQuery` call sites
follow the same underlying principle where practical: keep the
TanStack-Start-specific/Zero-specific surface thin, and push real logic
into plain functions that don't need framework-hook mocking to test.

This is a **coding-convention-level decision**, not just a test-setup one —
it constrains how server functions and route components should be
structured project-wide, beyond this file's own scope. See Reasoning below
for the propagation question this raises for `coding-conventions/`.

## Reasoning

- Vitest vs. Jest had no real contested tradeoff — every source agreed,
  and TanStack's own docs corroborate it, so this wasn't a close call.
- The `createServerFn`/route-component/`useQuery` testing gap was
  deliberately not papered over: multiple sources independently confirm
  it's a real, currently-unresolved framework limitation, not a
  documentation gap this project could just look past. Presenting a single
  clean recommendation here would have hidden that the underlying
  workaround has real, cited failure modes (nested server-function calls,
  skipped middleware).
- The thin-wrapper convention was chosen over accepting the
  `vi.mock(createServerFn)` workaround's caveats, and over deferring
  server-function testing entirely to the integration-test layer, because
  it's the only option of the three that gives server-function logic fast
  unit-level feedback without a known-incomplete mocking approach.

## Sources

- [tanstack.com/router — testing guidance](https://tanstack.com/router/latest/docs)
  and community discussions/GitHub issues confirming no official
  TanStack Start testing story exists for route components or
  `createServerFn`.
- Comparative Vitest-vs-Jest benchmarks and TanStack Vitest endorsement
  (multiple 2026 sources, consistent findings).
- No official Zero documentation found covering unit-testing `useQuery` in
  isolation (`zero.rocicorp.dev/docs` covers query behavior, not testing
  it) — confirms the gap rather than an oversight in this research.
