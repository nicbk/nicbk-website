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
EXPOSE 3000
# --host: bind beyond localhost so Docker's port mapping can reach the
# dev server inside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# .output/ is self-contained (all dependencies bundled by nitro) — no
# node_modules, source, or build tooling in the production image.
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
