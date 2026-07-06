# Testing: Scaffold, Tooling, and CI

## Unit (Vitest)

- `env.ts`: parsing succeeds with a valid environment; parsing throws with a
  clear, variable-naming message when a required var is missing or malformed.
- One trivial passing test exists so the CI `vitest run` step exercises a
  real (non-empty) suite.

## CI as its own verification

This task's deliverable is partly the gate itself, so "tests pass" here also
means: on this task's PR, the workflow runs and passes all four steps (Biome
check, typecheck, `vitest run`, PR-title lint). A deliberately non-conforming
PR title must fail the PR-title step (verified once, manually or via a
throwaway check).

## Not tested here

- No e2e/Playwright yet (added with the app shell + containerization task).
- No component/DOM tests yet (no components exist until later tasks).

## Coverage

Coverage reporting is wired (Vitest `v8`) but the ratchet baseline is
established here as the starting point; the enforcing ratchet gate is added
in the `containerization-and-deployment` task alongside the rest of the
extended CI.
