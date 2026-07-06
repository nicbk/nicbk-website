#!/usr/bin/env bash
# Pull-based deploy — run by the systemd timer defined in flake.nix (see
# research/devops-deployment/deployment-strategy.md). Polls origin/main and,
# only when a new commit has landed, fast-forwards the checkout and
# rebuilds/restarts the production Compose stack on the host. No
# GitHub-triggered process is ever given Docker-socket or
# production-network access — the host only makes outbound connections.
#
# Rollback = revert the commit on main through a normal reviewed PR; the
# next poll redeploys the reverted state. (Faster stopgap, manually on the
# host: git checkout <previous-sha> && docker compose -f docker-compose.yml up -d --build)
set -euo pipefail

repo_dir="${1:?usage: deploy.sh <path-to-repo-checkout>}"
cd "$repo_dir"

git fetch origin main

current_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse origin/main)"

if [ "$current_sha" = "$remote_sha" ]; then
  echo "deploy: already at origin/main ($current_sha) — nothing to do"
  exit 0
fi

echo "deploy: updating $current_sha -> $remote_sha"
# --ff-only: the checkout must never diverge from main; if it somehow has,
# fail loudly instead of merging.
git merge --ff-only origin/main

# Explicit -f: never merge docker-compose.override.yml (dev/HMR) into a
# production deploy.
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d

echo "deploy: done — now at $(git rev-parse HEAD)"
