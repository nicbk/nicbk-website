# Status: Scaffold, Tooling, and CI

**State:** Implemented locally — awaiting GitHub repo setup so the PR/CI/review
gate can run.

- Branch: `app-shell-and-home/scaffold-tooling-and-ci` (created, implementation
  committed)
- Sub-issue: not opened — **blocked: no GitHub remote configured and no `gh`
  CLI installed on this machine yet.** Once the repo exists on GitHub, open the
  feature parent issue + task sub-issues, self-assign this one, and record the
  numbers here.
- PR: none yet (same blocker)
- CI: workflow authored (`.github/workflows/ci.yml`); needs the self-hosted
  Sysbox runner registered to the repo before it can run
- Human review: pending PR

## Verification done locally (2026-07-05)

- `npm run dev` boots and SSRs the root document (lang/meta/title correct).
  `/` returns the router's default not-found placeholder inside the root
  document — expected, since the `(personal-site)` group is deliberately empty
  until the `home-page` task and the minimal root not-found boundary belongs
  to `app-shell-and-header`.
- `npx biome ci .` clean (a11y rules active via the recommended preset).
- `npm run typecheck` clean (strict + agreed extras).
- `npm test` — 3/3 passing (env parse success, missing-required-var failure,
  malformed-var failure).
- Env fail-fast verified end-to-end: `PORT=not-a-port npm run dev` fails
  server rendering at the entry's first import with
  `Invalid environment configuration — … PORT: Invalid input: expected
  number, received NaN`.
- Lefthook pre-commit hook installed (`.git/hooks/pre-commit`), autofixes
  staged files only via `biome check --write {staged_files}` + `stage_fixed`.

## Deviations / notes

- Pre-commit tooling is Lefthook alone (no lint-staged): Lefthook natively
  provides staged-file filtering (`{staged_files}`) and re-staging
  (`stage_fixed`), which is the entirety of what lint-staged would add — the
  decided behavior (staged-only Biome autofix) is met with one fewer tool.
- `routeTree.gen.ts` is committed (excluded from Biome) so CI's typecheck
  works without a generation step.
- The PR-title-lint failure case ("a deliberately non-conforming PR title
  must fail") still needs its one-time verification once the repo + runner
  exist.

## Log

- 2026-07-05 — Task claimed (locally; no sub-issue yet, see blocker above).
  Branch created; full scaffold implemented: TanStack Start (react-start
  1.168.x, Vite 8, React 19), strict TS + extras, Biome 2.5 (single
  formatter/linter, kebab-case filenames, named-exports-only,
  function-declaration components, inline type imports, import grouping),
  Zod `env.ts` + `.env.example`, Vitest 4 + testing-library/jsdom + v8
  coverage, Lefthook pre-commit, GitHub Actions CI workflow (self-hosted,
  `pull_request`-only, SHA-pinned actions, no GitHub-side secrets). All
  local checks green.
