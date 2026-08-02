# syntax=docker/dockerfile:1

# App-server image — multi-stage per
# research/devops-deployment/containerization-and-build.md:
#   deps   → npm ci layer, reused by both dev and build
#   dev    → Vite dev server (used only by docker-compose.override.yml)
#   build  → production build (.output/, self-contained via the nitro plugin)
#   runner → slim production stage serving .output/server/index.mjs
#
# Debian-slim (not Alpine) to avoid silent musl/glibc native-module
# mismatches as later features add dependencies.

FROM node:22-slim AS deps
WORKDIR /app
# package*.json first so source-only changes don't invalidate the install
# layer; the cache mount additionally survives dependency changes.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS dev
# Source is bind-mounted over /app by docker-compose.override.yml, with the
# image's own /app/node_modules preserved via an anonymous volume — this
# COPY only makes the stage runnable standalone.
COPY . .
# The Compose `pre_start` migration step runs the same command against either
# image, so both put the bundled migrator at the same path — outside /app,
# where the dev bind mount can't hide it (see scripts/bundle-migrator.mjs).
RUN node scripts/bundle-migrator.mjs
ENV MIGRATIONS_DIR=/app/src/db/migrations
EXPOSE 3000
# --host: bind beyond localhost so Docker's port mapping can reach the
# dev server inside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
ENV NODE_ENV=production
# Vite inlines VITE_-prefixed variables into the client bundle at build time,
# so this one has to be present *here* — an env_file at run time is too late.
# It is not a secret (the browser dials this address itself), which is why it
# can travel as a build arg rather than a mounted secret. Compose supplies it
# from the same .env everything else reads; see .env.example.
ARG VITE_ZERO_CACHE_URL
ENV VITE_ZERO_CACHE_URL=${VITE_ZERO_CACHE_URL}
RUN npm run build
RUN node scripts/bundle-migrator.mjs

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# .output/ is self-contained (all dependencies bundled by nitro) — no
# node_modules, source, or build tooling in the production image.
COPY --from=build /app/.output ./.output
# Migrations: the bundled runner (no node_modules needed) plus the committed
# SQL it applies, for the Compose `pre_start` step.
COPY --from=build /usr/local/lib/migrate.mjs /usr/local/lib/migrate.mjs
COPY --from=build /app/src/db/migrations ./src/db/migrations
ENV MIGRATIONS_DIR=/app/src/db/migrations
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
