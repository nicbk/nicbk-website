# Task: Containerization and Deployment

Package the working app as a container, define the Compose stack (app service
only, extensible), extend CI with the e2e/accessibility/coverage steps, and
wire the pull-based deployment so `main` ships to the host automatically.

## What this task does — concretely

- Author the app-server **multi-stage `Dockerfile`** with `dev`, `build`, and
  `runner` targets on a `node:<version>-slim` base (not Alpine, given
  native-module risk in the Zero/Better Auth space these later features will
  add). The `runner` stage runs TanStack Start's
  `.output/server/index.mjs` production entry point.
- Author **`docker-compose.yml`** (target `runner`, production) and
  **`docker-compose.override.yml`** (target `dev`, bind mounts + HMR env),
  containing **only the app-server service** for now, structured so later
  features add Postgres/Garage/zero-cache/GROBID as siblings rather than
  rewriting it. Secrets via git-ignored `.env` / `env_file:` on the host.
- Extend the CI workflow from `scaffold-tooling-and-ci` with: **Playwright**
  e2e smoke/navigation/theming tests, **`@axe-core/playwright`** inline a11y
  assertions via a shared fixture, and the **ratchet coverage** gate (Vitest
  `v8`, unit-only, must not drop PR-over-PR; HTML report as a CI artifact).
- Wire the **pull-based deployment**: the host's systemd deploy timer polls
  `origin/main` and, on a new commit, runs `git pull && docker compose build
  && docker compose up -d` on the host — no GitHub-triggered process gets
  Docker-socket or production-network access. Document rollback = revert the
  commit on `main`.
- Confirm `docker compose up` serves the home page locally with working HMR,
  and the production `runner` image serves it from the built output.

## Not in this task

- Any data-layer service in Compose (added by later features).
- Backup/monitoring (GlitchTip/restic/ntfy) — separate later concerns, not
  part of this feature.
