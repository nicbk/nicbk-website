# Status: Containerization and Deployment

**State:** Merged (2026-07-06) — PR #12, squash-merged after green CI +
human review; issue #6 auto-closed. Follow-up PR added a deploy.sh
self-heal (build + start when the checkout is at origin/main but the stack
isn't running — a fresh clone otherwise never started it).

- Branch: `app-shell-and-home/containerization-and-deployment`
- Sub-issue: [#6](https://github.com/nicbk/nicbk-website/issues/6), self-assigned
- PR: [#12](https://github.com/nicbk/nicbk-website/pull/12) (`Closes #6`)
- CI: temporary GitHub-hosted runners — switch deferred to
  [#11](https://github.com/nicbk/nicbk-website/issues/11) (see deviations)
- Human review: pending

## Verification done locally (2026-07-06)

- Production image (`runner` target): built via
  `docker compose -f docker-compose.yml build`, serves the home page at
  `:3000` (HTTP 200, both content lines in the SSR HTML), runs as the
  non-root `node` user, `.output/` only (no node_modules/source).
- Dev container (override): `docker compose up` serves the home page;
  a host-side source edit was reflected by the containerized dev server
  within ~2s (bind mount + `CHOKIDAR_USEPOLLING`), then reverted.
- Deploy dry-run: cloned a stale checkout against a local bare "origin"
  whose `main` was one commit ahead; `deploy/deploy.sh` detected the new
  SHA, fast-forwarded, rebuilt, and started the stack (HTTP 200 with
  content); an immediate second run correctly no-oped. `bash -n` clean.
- Playwright e2e: 10/10 in **both** modes — dev server (local default) and
  `CI=true` (production build + `npm run start`, the path CI exercises).
- Coverage ratchet script: all three cases verified (missing baseline →
  pass with notice; equal → pass; drop → exit 1).
- Biome (`ci` mode, exit 0), typecheck (cmk + tsc), 38/38 unit tests,
  `npm run build` → `.output/server/index.mjs` runs with plain `node`,
  honors `PORT`.
- NOT verified locally: the NixOS module in flake.nix (no nix on this
  machine) — needs host-side validation (e.g. `nix flake check` /
  `nixos-rebuild build-vm` per hosting-and-infrastructure.md) when wired
  into the system flake, and the repo-level "require approval for all
  outside collaborators" setting should be reconfirmed in the GitHub UI.

## Deviations / notes (all user-approved 2026-07-06)

- **Self-hosted runner switch deferred to #11.** The feature plan scopes
  this task's compose stack to the app service only, and the runner needs
  host-side work (Sysbox runtime + registration credential). CI stays on
  GitHub-hosted runners; all `TODO(#6)` comments were re-pointed to
  `TODO(#11)`.
- **`nitro` Vite plugin (v3 beta) added.** The Vite-plugin-based TanStack
  Start emits only a fetch-handler bundle by default; `nitro()` restores
  the decided `.output/server/index.mjs` self-contained entry. Addendum
  recorded in research/devops-deployment/containerization-and-build.md.
- **`prepare` script made git-aware** (`lefthook install` hard-fails in a
  Docker build context; `LEFTHOOK=0` doesn't exempt `install`) — also in
  that addendum.
- **HMR container fix simplified**: only `CHOKIDAR_USEPOLLING` +
  `--host 0.0.0.0` were needed; the vinxi-era
  `routers.client.vite.server.hmr` workaround no longer applies. Addendum
  recorded in research/devops-deployment/hosting-and-infrastructure.md.
- **Skip-link e2e assertion widened**: against the fast-hydrating
  production server the router handles the `#main-content` hash navigation
  and the focus handoff lands focus on `main h1` instead of `<main>`
  itself; the test now asserts focus lands *inside* main (the decided
  behavior), covering both timings.
- **Ratchet baseline mechanism** (left open by
  research/testing-qa/test-coverage-and-ci-gating.md): a
  `coverage-baseline.yml` workflow on `push: main` uploads
  `coverage-summary.json` as a 90-day artifact; PR runs download the most
  recent one via `gh run download` (read-only `actions: read` permission)
  and compare `total.lines.pct`. Missing baseline (bootstrap/expiry) passes
  with a notice.
- **CI e2e runs against the production build** (`npm run build` +
  `npm run start` via Playwright's webServer when `CI=true`), so the
  production serving path — not the dev server — is what e2e + axe gate.

## Log

- 2026-07-06 — Claimed (#6), implemented on branch: Dockerfile
  (deps/dev/build/runner, node:22-slim, BuildKit npm cache mount),
  .dockerignore, docker-compose.yml (app on `app-internal` network,
  `env_file: .env` optional, restart unless-stopped) +
  docker-compose.override.yml (dev target, bind mount + node_modules
  volume, polling), nitro plugin + `start` script, CI extended (e2e job,
  coverage ratchet + HTML artifact, baseline workflow), deploy/deploy.sh +
  flake.nix nixosModules.default (docker + oneshot service + timer,
  2min default poll). Follow-up issue #11 opened for the runner switch.
  All local checks green.
