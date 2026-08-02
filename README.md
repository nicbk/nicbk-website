# nicbk-website

The personal website of Nicolás Kennedy — a server-rendered
[TanStack Start](https://tanstack.com/start) (React) application, designed
to be fully self-hosted on a single node as one Docker Compose stack with
pull-based continuous deployment.

Live today: the site shell (sticky header, light/dark theming, WCAG 2.2 AA
accessibility) and the home page. Planned on top of the same stack: the
about/projects/blog pages, authentication, and an academic literature
tracker — see
[high-level-guidance/design/DESIGN.md](./high-level-guidance/design/DESIGN.md)
for the full picture and
[features/index.md](./features/index.md) for the live roadmap and build
order.

This repo is unusually documentation-driven: every stack and process
decision is recorded with reasoning and sources under
[research/](./research/index.md), work is tracked per-feature under
[features/](./features/index.md), and agent working conventions live in
[AGENTS.md](./AGENTS.md). The documentation root is
[index.md](./index.md).

## Local Development

Prerequisites: Node.js 22+ and npm, plus Docker — the app now needs a
Postgres to talk to, and the integration tests start their own.

```bash
npm ci
cp .env.example .env   # then fill in the required values (see below)
docker compose up      # database + migrations + app, all in containers
```

To run the server on the host instead of in a container, start just the
database and point `DATABASE_URL` at the published port
(`postgres://…@localhost:5432/…` rather than `@db:5432`):

```bash
docker compose up -d db
npm run dev        # dev server at http://localhost:3000
```

Checks and tests:

```bash
npm run lint           # Biome (format + lint)
npm run typecheck      # CSS Modules codegen + tsc
npm test               # Vitest unit tests
npm run test:coverage  # unit tests + coverage report (coverage/)
npm run test:integration  # real Postgres via Testcontainers (needs Docker)
npx playwright install chromium   # one-time, before first e2e run
npm run test:e2e       # Playwright e2e + axe accessibility checks
npm run test:e2e:auth  # sign-in flow: stubbed Google + Testcontainers Postgres
```

`test:e2e:auth` is its own tier because the Google sign-in round trip needs a
real database and a patched app server; it starts both itself (on port 3100, so
it can run alongside a dev server) and needs Docker. Everything else about
`/sign-in` is covered by the ordinary `test:e2e` suite.

Database schema:

```bash
npm run db:generate-schema       # regenerate src/db/schema/identity.ts from the auth config
npm run db:generate-zero-schema  # regenerate src/zero/schema.gen.ts from the Drizzle schema
npm run db:generate-migration    # diff the schema into src/db/migrations/*.sql
npm run db:migrate               # apply migrations (containers do this on `up`)
```

Two files under `src/` are generated and guarded by CI drift checks, so both
generators must be re-run after a schema change. Adding a table that Zero should
sync also means naming it in
[drizzle-zero.config.ts](./drizzle-zero.config.ts) and adding it to the
`zero_data` publication in the same migration — see the comments in
[src/db/migrations/0001_lit_tracker_articles_and_upload_jobs.sql](./src/db/migrations/0001_lit_tracker_articles_and_upload_jobs.sql).

A pre-commit hook (lefthook, installed by `npm ci`) auto-formats staged
files. Environment variables are validated at startup by `src/env.ts`, which
throws naming any that are missing or malformed. The database URL, Better Auth
secret/URL, Google OAuth credentials, and the two Zero API keys are all
**required** — copy
[.env.example](./.env.example) to `.env` and fill it in before starting the
app. Everything there is server-only; nothing is `VITE_`-prefixed, so no value
reaches the client bundle.

## Running in Docker

The same multi-stage [Dockerfile](./Dockerfile) serves both workflows —
see
[research/devops-deployment/containerization-and-build.md](./research/devops-deployment/containerization-and-build.md)
for the design.

```bash
# Local dev container: bind-mounted source with hot reload
# (docker-compose.override.yml is auto-merged)
docker compose up

# Production image: self-contained build served by plain Node
docker compose -f docker-compose.yml up -d
```

Both serve <http://localhost:3000>, and both bring up four services: the
Postgres database, a one-shot `migrate` job that applies the committed
migrations and exits, the app, which starts only once that job has succeeded,
and `zero-cache` (the sync engine) on <http://localhost:4848>. Re-running `up`
re-runs the migration job harmlessly — Drizzle records what it has already
applied.

`zero-cache` also waits on the migration job, because it reads the `zero_data`
publication that a migration creates. If a migration has not actually been
applied it exits with `Unknown or invalid publications` and restarts until it
has been; `up` without `--build` after adding a migration is the usual cause,
since the migrator runs from the built image.

The browser talks to `zero-cache` directly on 4848 in local development —
`VITE_ZERO_CACHE_URL=http://localhost:4848` — with no proxy in between, because
cookies are keyed by host and ignore the port, so the session cookie set on
:3000 is sent to :4848 already. Production routes it through the site's own
origin instead; see step 5 of the deployment section.

Secrets/config come from a git-ignored `.env` next to the compose file. It is
**required** now: the app refuses to start without it, and Compose fails with
a named error if the Postgres credentials are missing. `VITE_ZERO_CACHE_URL` is
read at **build** time rather than start time (Vite inlines it into the client
bundle), so changing it needs a rebuild, not just a restart.

If the dev container ever loads a blank/"something went wrong" page in a
browser that opened it before — typically a phone, reporting a module error
such as `Importing binding name 't' is not found.` — that browser is holding a
stale copy of the dev server's pre-bundled dependencies. Clear that browser's
cache for the site once (or open it in a private tab); the dev server no longer
serves those files as permanently cacheable, so it does not recur (see
`revalidateOptimizedDepsInDev` in [vite.config.ts](./vite.config.ts)). If the
container itself looks out of date after a dependency change, reset its
`node_modules` volume, which `docker compose up` otherwise carries over between
runs:

```bash
docker compose down -v && docker compose up --build
```

## Production Deployment (NixOS)

Deployment is pull-based: a systemd timer on the host polls `origin/main`
and, on a new commit, fast-forwards a local checkout and rebuilds/restarts
the Compose stack. No GitHub-triggered process ever gets Docker-socket or
production-network access. Design:
[research/devops-deployment/deployment-strategy.md](./research/devops-deployment/deployment-strategy.md).

One-time host setup:

1. Clone the repo (HTTPS — the deploy only pulls, no credentials needed):

   ```bash
   sudo git clone https://github.com/nicbk/nicbk-website.git /var/lib/nicbk-website
   ```

2. Provision the git-ignored `.env` beside `docker-compose.yml`
   (`chmod 600`; see
   [research/devops-deployment/secrets-and-environment-config.md](./research/devops-deployment/secrets-and-environment-config.md)).
   **Required** — the stack will not start without it. Use
   [.env.example](./.env.example) as the template: Postgres credentials, a
   `DATABASE_URL` matching them, a freshly generated `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL=https://nicbk.com`, the Google OAuth client
   credentials whose authorized redirect URI is
   `https://nicbk.com/api/auth/callback/google`, and freshly generated
   `ZERO_QUERY_API_KEY`, `ZERO_MUTATE_API_KEY`, and `ZERO_ADMIN_PASSWORD`
   values, plus `VITE_ZERO_CACHE_URL=https://nicbk.com/zero`.

   `VITE_ZERO_CACHE_URL` is the one variable here that must be right *before
   the build*, not just before the start: Vite inlines `VITE_`-prefixed values
   into the client bundle, and Compose passes it through as a build arg. It is
   also the only public one — the browser opens that WebSocket itself. See
   step 5 for the nginx rule it depends on.

3. Wire this repo's NixOS module ([flake.nix](./flake.nix)) into the
   host's system flake:

   ```nix
   {
     inputs.nicbk-website.url = "github:nicbk/nicbk-website";

     # ...in the host's modules list:
     #   nicbk-website.nixosModules.default
     #   {
     #     services.nicbk-website = {
     #       enable = true;
     #       repoPath = "/var/lib/nicbk-website";
     #       # pollInterval = "2min";  # default
     #     };
     #   }
   }
   ```

4. `nixos-rebuild switch`. The module enables Docker and installs the
   `nicbk-website-deploy` service + timer; the first tick builds and
   starts the stack on its own (the deploy script self-heals a
   not-yet-running stack).

5. Proxy `/zero/` to the sync engine in the host's reverse proxy, alongside
   the existing rule for the app:

   ```nginx
   location /zero/ {
       proxy_pass http://127.0.0.1:4848;   # no trailing slash: keep the prefix
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_read_timeout 1d;              # long-lived sync connections
   }
   ```

   Three things matter here. **Do not strip the `/zero` prefix** — zero-cache's
   own router matches an optional leading base segment and expects to see it.
   The `Upgrade`/`Connection` headers are what let the WebSocket through; without
   them clients connect, fail, and retry forever. And serving the sync engine
   from the site's **own origin**, rather than a `zero.nicbk.com` subdomain, is
   what lets the browser send its Better Auth session cookie — which is how
   `/api/zero/query` knows who is asking — without that cookie having to be
   widened to every subdomain of the site.

The app serves on host port 3000 and zero-cache on 127.0.0.1:4848 (loopback
only — nginx is its sole client). TLS/reverse-proxying is host-level scope,
outside this repo (see
[research/devops-deployment/hosting-and-infrastructure.md](./research/devops-deployment/hosting-and-infrastructure.md)).

**Rollback** = revert the offending commit on `main` through a normal
reviewed PR; the next poll redeploys the reverted state. Module changes in
`flake.nix` reach the host only via a flake-input lock update, not the
deploy timer.

## CI

Every PR is gated by GitHub Actions
([.github/workflows/ci.yml](./.github/workflows/ci.yml)): Biome,
typecheck, unit tests with a ratchet coverage gate (coverage must not
drop below the last `main` baseline), drift checks on the generated GPG and
auth-schema artifacts, integration tests against a real Postgres started by
Testcontainers, Playwright e2e + axe against the
production build, the signed-in e2e (stubbed Google, real Postgres, real
zero-cache) covering the sign-in flow and the Lit Tracker's live sync, and
Conventional-Commits PR-title lint. The workflows
use zero repository secrets and pin all third-party actions by commit
SHA; design and threat model in
[research/devops-deployment/ci-pipeline.md](./research/devops-deployment/ci-pipeline.md).
