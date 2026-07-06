# Testing: Containerization and Deployment

## End-to-end (Playwright) — established as a CI step here

- Home smoke, header navigation, focus handoff, and theming (no-flash +
  persistence) tests run in CI against the app, asserting on settled DOM
  state (accommodating the flagged Start+Playwright hydration/routing-timing
  flakiness).
- The shared axe fixture (`@axe-core/playwright`) runs inline within these
  e2e tests, blocking on critical/serious, in both themes.

## Coverage gate — established here

- Vitest `v8` unit coverage is enforced ratchet-style: the PR fails if
  coverage drops below the recorded baseline. HTML report uploaded as a CI
  artifact.

## Container / build verification

- The `runner` image builds and serves the home page from
  `.output/server/index.mjs`.
- `docker compose up` (with override) serves the home page locally with HMR
  reflecting a source edit.
- A smoke check runs against the containerized app (not only the dev server)
  so the production serving path is exercised.

## Deployment verification

- The deploy timer's `git pull && docker compose build && docker compose up
  -d` sequence is verified to redeploy on a new `main` commit (host-level
  check / dry-run), and that no GitHub-triggered process is granted
  Docker-socket or production-network access.

## Not tested here

- Data-layer behavior (no data services exist in this feature).
