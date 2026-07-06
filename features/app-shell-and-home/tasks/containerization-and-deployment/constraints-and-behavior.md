# Constraints and Behavior: Containerization and Deployment

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Cross-cutting quality" section):

- The app runs identically via `npm run dev` and `docker compose up`, with
  HMR in both; the production image serves from `.output/server/index.mjs`.
- CI passes with the full step set: Biome, typecheck, unit tests with ratchet
  coverage, Playwright e2e smoke, axe checks, PR-title lint.
- The pull-based deploy timer redeploys `main` on the host.

## Behavior details

- `docker compose up` (override applied) brings up the app in `dev` target
  with bind mounts + HMR; `docker compose -f docker-compose.yml up` (no
  override) runs the `runner` target serving the built output.
- The Compose file contains only the app-server service and is shaped so a
  later feature can add a service without restructuring existing entries.
- The ratchet coverage gate fails a PR whose unit coverage drops below the
  established baseline; the HTML coverage report is downloadable as a CI
  artifact.
- On a new `main` commit, the host timer pulls, rebuilds, and restarts the
  app with no GitHub-side process holding Docker-socket/production access.
- No GitHub-side secrets are required for CI; production secrets live only in
  the host's git-ignored `.env`.

## Dependencies

- Requires a working home page (`home-page`) to containerize, serve, and
  smoke-test end to end.
