# Task: Scaffold, Tooling, and CI

Initialize the TanStack Start project and the decided top-level layout, wire
the core tooling (TypeScript, Biome, Zod-validated `env.ts`, Vitest), and
stand up the GitHub Actions CI workflow that will gate every subsequent
task's PR.

This is the first task because the decided process gates each task's PR on
CI — the gate must exist before there is a second PR to gate.

## What this task does — concretely

- Initialize a single-package TanStack Start app (npm) with file-based
  routing, producing the decided top-level structure: `src/` wrapper,
  `src/routes/` with `__root.tsx` and an empty `(personal-site)` route group,
  `src/styles/` (placeholder), `src/env.ts`, root-level `tsconfig.json`,
  `vite.config.ts`, `biome.json`, `package.json`, `.gitignore`.
- Configure TypeScript `strict` plus the agreed extras
  (`noUncheckedIndexedAccess`, etc.; not `exactOptionalPropertyTypes`).
- Configure Biome as the single formatter/linter (including its `a11y`
  rules); add the pre-commit hook that autofixes staged files.
- Implement `src/env.ts` as a Zod schema over `process.env`, imported first
  at the server entry so bad config fails at startup; commit `.env.example`,
  gitignore `.env`.
- Set up Vitest with `@testing-library/react` + jsdom and one trivial passing
  unit test so the test step is real.
- Author the GitHub Actions workflow: Biome lint/format check, typecheck,
  `vitest run`, and PR-title Conventional-Commits linting
  (`amannn/action-semantic-pull-request`), on the self-hosted
  Sysbox-isolated runner, triggered on `pull_request` only, all third-party
  Actions pinned by commit SHA. No GitHub-side secrets required.

## Not in this task

- Docker/Compose and deployment (task `containerization-and-deployment`).
- Playwright e2e, axe, and coverage ratchet (added in that later task, which
  extends this workflow).
- Any styling, tokens, header, or page content.
