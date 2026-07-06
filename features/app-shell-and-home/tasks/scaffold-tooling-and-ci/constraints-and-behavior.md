# Constraints and Behavior: Scaffold, Tooling, and CI

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Project structure and tooling" section):

- Repository follows the decided top-level layout (`src/`, `src/routes/` with
  `__root.tsx` + `(personal-site)` group, `src/styles/`, `src/env.ts`,
  root-level config files).
- TypeScript `strict` + agreed extras; `npm run typecheck` is clean.
- Biome is the single linter/formatter; pre-commit hook autofixes staged
  files; CI runs the full project-wide Biome check.
- `src/env.ts` validates `process.env` with Zod and fails fast on missing/
  invalid required vars; `.env.example` committed, `.env` gitignored.
- Naming conventions hold (kebab-case files/route-group folders, named
  exports).

Plus this task-specific bar (enabling the feature's "CI passes" criterion):

- `npm run dev` serves an empty root route successfully.
- The CI workflow exists and is green on this task's own PR: Biome check,
  typecheck, `vitest run`, and PR-title Conventional-Commits lint all pass.
- The workflow runs on the self-hosted runner, `pull_request`-triggered only
  (never `pull_request_target`), with all third-party Actions SHA-pinned, and
  needs zero GitHub-side secrets.

## Behavior details

- Importing `env.ts` with a required variable missing throws at startup with
  a clear message naming the offending variable — it does not fall through to
  a later runtime failure.
- The pre-commit hook only touches staged files; CI is the authoritative,
  project-wide gate.
