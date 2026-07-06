# Containerization and Build

Researched: 2026-07-05. Decided: 2026-07-05.

Build/packaging strategy for the heterogeneous services that run together
on one host — the app server's own Dockerfile and build output, base image
and package-manager choices, and image-sourcing policy for the pre-built
services — building on the unified `docker-compose.yml` decided in
[hosting-and-infrastructure.md](./hosting-and-infrastructure.md) (identical
command in both environments, bind-mounted source + polling/HMR fixes for
local hot-reload) and the on-host, build-at-deploy-time mechanism decided in
[deployment-strategy.md](./deployment-strategy.md) (`docker compose build`
runs directly on the production host on every merge, not in CI). Guiding
principles from [index.md](./index.md) apply here as everywhere in this
category: prefer open-source tooling, minimize manual configuration. Also
builds on
[../system-architecture/monorepo-structure.md](../system-architecture/monorepo-structure.md)
(single TanStack Start package, no workspace tooling) and
[../system-architecture/service-topology.md](../system-architecture/service-topology.md)
(the five services: app server, zero-cache, Postgres, Garage, GROBID).

Boundary notes: secrets/environment variable *management* (as opposed to
which files/images reference them) belongs to
[secrets-and-environment-config.md](./secrets-and-environment-config.md)
(not yet researched). Database migration sequencing belongs to
[database-migrations.md](./database-migrations.md) (not yet researched).

## Decision

### One Dockerfile, two Compose files: base (production) + override (local dev)

The app server's Dockerfile is multi-stage, with a `dev` stage and a
`runner` stage (see below). Which one actually runs is selected the
standard Compose way — via `build.target` — split across **two Compose
files**, not one:

- **`docker-compose.yml`** (the base file, already established as the file
  production runs via `docker compose -f <path> up -d`): the app-server
  service's `build.target` is `runner`, no source bind-mount.
- **`docker-compose.override.yml`** (local-only): sets `build.target: dev`,
  adds the source bind-mount and the `CHOKIDAR_USEPOLLING`/HMR environment
  variables already decided in `hosting-and-infrastructure.md`.

Locally, `docker compose up` (no `-f` flag, exactly as already decided)
auto-merges the override file — Compose's own built-in, standard behavior
for this exact base/override split, not a custom mechanism. Production's
already-decided explicit `docker compose -f <path> up -d` invocation names
only the base file, so it never sees the override — no special exclusion
logic needed, it falls out of the invocation already committed to
elsewhere. This was chosen over a single-file alternative (one
`docker-compose.yml`, with `target: ${BUILD_TARGET:-runner}` switched by an
`.env` variable) because it needs zero interpolation for a reader to decode
and uses Compose's purpose-built mechanism for base/environment-specific
config splits, rather than an env-var-driven default a reader has to trace
through to understand why local and prod differ.

### App server Dockerfile: multi-stage, `dev` and `runner` targets

- **`deps`**: installs dependencies via `npm ci` (see package-manager
  decision below), with `COPY package*.json` preceding this step and source
  copied only afterward, so source-only changes don't invalidate the
  install layer. Uses a BuildKit cache mount
  (`RUN --mount=type=cache,target=/root/.npm`) for npm's cache directory —
  this doesn't fix a missing-cache problem (the on-host Docker layer cache
  already persists between deploys, since deploys happen via
  `docker compose build` on the same host every time, per
  `deployment-strategy.md`), but it's a free additional win for the
  partial-dependency-change case (one changed package doesn't force
  re-fetching everything).
- **`dev`** (built `FROM deps`): no build step; runs the Vite/vinxi dev
  server directly. Used only by `docker-compose.override.yml`.
- **`build`** (built `FROM deps`): runs the production build, producing
  TanStack Start/Nitro's self-contained `.output/` directory.
- **`runner`** (the production target): a fresh, slim stage that copies
  only `.output/` and production dependencies from earlier stages — no
  devDependencies, no source, no build tooling. Starts via
  `node .output/server/index.mjs` — TanStack Start's documented production
  entry point (Nitro's default Node-server preset output, runnable with
  plain `node`, no exotic preset configuration needed). `package.json`
  **must** include `"type": "module"` — the build output is ESM-only, and
  without this Node treats files as CommonJS and errors.

### Package manager: npm

**npm**, not pnpm or bun. TanStack Start's own tooling is package-manager
agnostic (its CLI supports npm/pnpm/yarn/bun/deno equally, defaulting to
npm in its own examples). Since
[monorepo-structure.md](../system-architecture/monorepo-structure.md)
already ruled out workspace tooling entirely, none of pnpm's headline
benefits (workspace hoisting/dedup) apply here. `npm ci` with
`COPY package*.json` is the most standard, most-documented Docker pattern,
and avoids a specific pnpm-in-Docker subtlety: pnpm's
content-addressable-store/symlink structure is reported to cache less
predictably in a plain Dockerfile than npm's flatter `node_modules`,
requiring an extra `pnpm fetch --frozen-lockfile` workaround step pnpm's
own docs recommend to get equivalent caching. Bun showed a large build-time
win in one build (~66%, switching from pnpm) but that comparison wasn't
against npm and is a single anecdotal report, not a broad benchmark, and
TanStack itself doesn't push either non-npm option — worth trying only if
on-host rebuild time becomes an actual practical pain point, not a default.

### Base image: `node:<version>-slim` (Debian-based), not Alpine

The app server's `runner` (and other) stages use a Debian-slim Node base
image, not Alpine. Alpine's smaller size (~5MB vs. ~200MB base) and
attack surface are real, but Alpine uses musl libc rather than glibc, which
can cause native-addon binaries to fail if they were built for/prebuilt
against glibc — a mismatch that can fail silently rather than at build
time. This project's dependency stack already has at least one native
module in the neighborhood (Zero's server-side replica storage uses a
native SQLite binding, `@rocicorp/zero-sqlite3` — though that specifically
runs inside the official `rocicorp/zero` container, not the app server's
own image) and Better Auth's password-hashing options include both native
(bcrypt/argon2 native bindings) and pure-JS/WASM implementations, meaning
whether the app server's own dependency tree stays fully native-module-free
depends on configuration choices not yet made. Given this is a personal
project without dedicated ops time to debug a silent musl/glibc mismatch,
Debian-slim is the safer default — consistent with current (2026) guidance
to start slim and only move to Alpine after confirming a dependency tree
has zero native/compiled modules.

### Image sourcing and pinning for the four pre-built services

All four non-custom services use their official maintained images, pinned
to a specific **version tag** (never `latest`, never an unstable/canary
tag) — not pinned by content digest:

- **PostgreSQL**: the official `postgres` image, pinned to a specific major
  version (e.g. `postgres:18`, per the v18+ floor decided in
  [../technologies/database.md](../technologies/database.md)) — compatible
  with the `wal_level=logical` requirement already decided in
  [service-topology.md](../system-architecture/service-topology.md).
- **Garage**: `dxflrs/garage`, pinned to a specific released version tag
  (e.g. `v2.3.0` at time of writing — the exact current tag is chosen at
  implementation time, not frozen here).
- **GROBID**: `grobid/grobid` (not `lfoppiano/grobid` — GROBID's own docs
  now recommend the former specifically because `lfoppiano/grobid`'s
  no-suffix tag changed meaning across versions: pre-0.8.2 it meant the
  lightweight CRF-only image, from 0.8.2 onward it means the full
  DL-model image), with an explicit `-full` suffix given the ~4GB RAM
  full-text-extraction usage already noted in `service-topology.md`.
- **Zero (`zero-cache`)**: `rocicorp/zero`, pinned to a specific released
  version tag — explicitly avoiding canary tags (e.g. `1.7.0-canary.4`
  style tags exist and are not appropriate for production).

**Version-tag pinning, not digest pinning, is the deliberate choice here.**
Digest pinning is objectively more reproducible — tags are mutable
pointers, digests are immutable content hashes — but it adds a real,
recurring manual burden (resolving and updating a 64-character hash by hand
on every intentional upgrade, typically mitigated with a bot like Renovate/
Dependabot, which is one more moving part for a solo-maintainer project).
Given the app's own code is already fully reproducible via git SHA on every
deploy (per `deployment-strategy.md`), the residual reproducibility gap
from tag-only pinning is narrowly about these four specific third-party
images silently changing content under a stable tag — a real but
low-probability risk for actively-maintained, reputable images like these,
and one this category's minimal-manual-config principle weighs against
taking on.

## Reasoning

- The base/override Compose-file split was chosen over a single-file
  `BUILD_TARGET` env var because it's Compose's actual built-in mechanism
  for this exact problem (environment-specific overrides layered on a
  shared base), and it requires no interpolation-syntax literacy from a
  future reader to understand why local and production differ — a direct
  application of this category's code/documentation-readability standard,
  not just a personal preference between two technically-equivalent
  options.
- npm over pnpm/bun follows directly from `monorepo-structure.md` already
  ruling out workspace tooling: pnpm's main advantages don't apply to a
  single package, and its Docker-caching subtlety is a real, documented
  cost with no offsetting benefit here. Bun remains a viable, officially
  supported fallback if build speed becomes a real problem later, deferred
  as a "measure, then maybe switch" call rather than decided now.
- Debian-slim over Alpine was resolved by risk asymmetry rather than a pure
  size/security tradeoff: a silent musl/glibc native-module failure is a
  bad, hard-to-debug failure mode for a project with no dedicated ops time,
  and at least one native dependency already exists somewhere in this
  stack's near vicinity (Zero's native SQLite binding) even though it may
  not end up in the app server's own image specifically.
- Version-tag over digest pinning for the four pre-built services was a
  direct application of the minimize-manual-configuration principle: the
  reproducibility gap digest pinning closes is narrow (only third-party
  base-image content silently changing under a stable tag) and the cost of
  closing it (manual hash maintenance, or a bot to do it) is disproportionate
  for a personal project whose own code is already fully reproducible
  through git.

## Addendum (2026-07-06, containerization-and-deployment task)

Two implementation-time findings, verified empirically and against the
current TanStack Start hosting docs:

- **The `.output/server/index.mjs` entry point requires the `nitro` Vite
  plugin** — it is not produced by `@tanstack/react-start` alone. The
  Vite-plugin-based Start (which replaced the vinxi/Nitro-built-in
  toolchain this doc's research assumed) emits only a fetch-handler bundle
  (`dist/server/server.js`, no listener) by default. Adding `nitro()` from
  the `nitro` package (published as a v3 beta — the framework's documented
  Node self-hosting path, user-approved 2026-07-06) restores the
  self-contained `.output/` output this doc decided on, runnable with plain
  `node` and honoring `PORT`. `.output/` bundles all dependencies, so the
  `runner` stage copies nothing else — no production `node_modules` layer
  is needed at all.
- **`npm ci` inside the image build needs a git-aware `prepare` script.**
  The repo's `prepare` script runs `lefthook install`, which hard-fails
  outside a git checkout (and `LEFTHOOK=0` does not exempt `install`), so a
  Docker build context (no `.git`) broke `npm ci`. Resolved by guarding
  `prepare` with `git rev-parse --git-dir` rather than using
  `npm ci --ignore-scripts`, which would also skip dependency lifecycle
  scripts.

## Sources

- [Docker docs — multi-stage builds](https://docs.docker.com/build/building/multi-stage/),
  [Warp — understanding the `target` field](https://www.warp.dev/terminus/docker-compose-target),
  [Docker docs — variable interpolation](https://docs.docker.com/reference/compose-file/interpolation/),
  [Docker docs — variable interpolation how-to](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) —
  `build.target` mechanics and Compose variable interpolation, for the
  rejected single-file `BUILD_TARGET` alternative.
- [DevToolbox — 2026 Compose guide](https://devtoolbox.dedyn.io/blog/docker-compose-complete-guide),
  [lours.me — Compose Tip #45: multi-stage target](https://lours.me/posts/compose-tip-045-multi-stage-target/) —
  the base-compose-plus-override-file pattern as the more commonly
  documented convention, chosen here.
- [TanStack Start — Hosting docs](https://tanstack.com/start/latest/docs/framework/react/guide/hosting) —
  the `.output/server/index.mjs` production entry point.
- [Railway — TanStack Start deployment guide](https://docs.railway.com/guides/tanstack-start),
  [dev.to — Deploy TanStack Start + PostgreSQL with Haloy](https://dev.to/ameistad/deploy-tanstack-start-postgresql-to-your-own-server-with-haloy-5cda) —
  concrete community multi-stage Dockerfile examples, including the
  `"type": "module"` ESM requirement.
- [npm — @tanstack/create-start](https://www.npmjs.com/package/@tanstack/create-start),
  [TanStack Start — Quick Start](https://tanstack.com/start/latest/docs/framework/react/quick-start) —
  TanStack's package-manager-agnostic tooling.
- [dev.to — Docker build time: pnpm → bun](https://dev.to/techresolve/solved-cut-my-nextjs-docker-build-time-by-23s-switching-from-pnpm-to-bun-4k1m),
  [pnpm — Docker docs](https://pnpm.io/docker),
  [Depot — optimal pnpm Dockerfile](https://depot.dev/docs/container-builds/optimal-dockerfiles/node-pnpm-dockerfile),
  [bun.com — Use TanStack Start with Bun](https://bun.com/docs/guides/ecosystem/tanstack-start) —
  package-manager Docker-caching comparison.
- [Minimus — choosing the best Node.js Docker image](https://www.minimus.io/post/choosing-the-best-node-js-docker-image),
  [OneUptime — Alpine vs. Debian-slim](https://oneuptime.com/blog/post/2026-02-08-how-to-choose-between-alpine-and-debian-slim-base-images/view),
  [dev.to — Dockerizing Node.js for Production, 2026 guide](https://dev.to/axiom_agent/dockerizing-nodejs-for-production-the-complete-2026-guide-7n3) —
  Alpine/musl vs. Debian-slim/glibc tradeoffs.
- [npm — @rocicorp/zero-sqlite3](https://www.npmjs.com/package/@rocicorp/zero-sqlite3),
  [WiseLibs/better-sqlite3 discussion #1270](https://github.com/WiseLibs/better-sqlite3/discussions/1270) —
  native-module presence in the Zero ecosystem and the glibc/musl
  build-vs-runtime-stage mismatch risk.
  [npm-compare — password hashing libraries](https://npm-compare.com/@node-rs/argon2,argon2,bcrypt,crypto,pbkdf2) —
  Better Auth's native vs. pure-JS/WASM hashing options.
- [dev.to — multi-stage Docker builds for fullstack apps](https://dev.to/devforgedev/multi-stage-docker-builds-for-fullstack-react-node-apps-1m02),
  [TestDriven.io — faster CI builds with Docker cache](https://testdriven.io/blog/faster-ci-builds-with-docker-cache/) —
  Dockerfile layer ordering and cache-mount tradeoffs for an on-host,
  never-pruned build environment.
- [Docker Hub — rocicorp/zero](https://hub.docker.com/r/rocicorp/zero),
  [rocicorp/hello-zero — reference compose file](https://github.com/rocicorp/hello-zero/blob/main/docker/docker-compose.yml),
  [GROBID docs — Grobid-docker](https://grobid.readthedocs.io/en/latest/Grobid-docker/),
  [Docker Hub — dxflrs/garage](https://hub.docker.com/r/dxflrs/garage) —
  official image sources for the four pre-built services.
- [Medium — pin Docker images to a digest](https://medium.com/@tofaau/pin-your-docker-images-to-a-digest-to-avoid-surprise-breaks-6607eee649a6),
  [Chainguard — container image digests](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/container-image-digests/) —
  digest vs. tag pinning tradeoffs.
