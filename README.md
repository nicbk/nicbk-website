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

Prerequisites: Node.js 22+ and npm. (Docker is only needed for the
container workflows below.)

```bash
npm ci
npm run dev        # dev server at http://localhost:3000
```

Checks and tests:

```bash
npm run lint           # Biome (format + lint)
npm run typecheck      # CSS Modules codegen + tsc
npm test               # Vitest unit tests
npm run test:coverage  # unit tests + coverage report (coverage/)
npx playwright install chromium   # one-time, before first e2e run
npm run test:e2e       # Playwright e2e + axe accessibility checks
```

A pre-commit hook (lefthook, installed by `npm ci`) auto-formats staged
files. Environment variables are validated at startup by `src/env.ts`;
see [.env.example](./.env.example) — no variable is required yet.

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

Both serve <http://localhost:3000>. Secrets/config come from a
git-ignored `.env` next to the compose file (optional until a feature
requires one).

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

2. Provision the git-ignored `.env` beside `docker-compose.yml` when a
   feature requires secrets (`chmod 600`; see
   [research/devops-deployment/secrets-and-environment-config.md](./research/devops-deployment/secrets-and-environment-config.md)).
   Optional while nothing is required.

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

The app serves on host port 3000; TLS/reverse-proxying to it is
host-level scope, outside this repo (see
[research/devops-deployment/hosting-and-infrastructure.md](./research/devops-deployment/hosting-and-infrastructure.md)).

**Rollback** = revert the offending commit on `main` through a normal
reviewed PR; the next poll redeploys the reverted state. Module changes in
`flake.nix` reach the host only via a flake-input lock update, not the
deploy timer.

## CI

Every PR is gated by GitHub Actions
([.github/workflows/ci.yml](./.github/workflows/ci.yml)): Biome,
typecheck, unit tests with a ratchet coverage gate (coverage must not
drop below the last `main` baseline), Playwright e2e + axe against the
production build, and Conventional-Commits PR-title lint. The workflows
use zero repository secrets and pin all third-party actions by commit
SHA; design and threat model in
[research/devops-deployment/ci-pipeline.md](./research/devops-deployment/ci-pipeline.md).
