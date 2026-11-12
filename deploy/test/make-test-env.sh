#!/usr/bin/env bash
# Writes a throwaway .env for the backup round trip (deploy/test/round-trip.sh),
# from .env.example with every secret freshly generated. For CI and local runs
# only: it refuses to touch an existing .env, which on the node is the real one.
#
#   deploy/test/make-test-env.sh <path-to-repo-checkout>
set -euo pipefail

repo_dir="$(cd "${1:?usage: make-test-env.sh <path-to-repo-checkout>}" && pwd)"
env_file="$repo_dir/.env"
[ ! -e "$env_file" ] || {
  echo "refusing to overwrite $env_file" >&2
  exit 1
}

hex() { openssl rand -hex "$1"; }
password="$(hex 16)"

sed \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$password|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=postgres://nicbk:$password@db:5432/nicbk|" \
  -e "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(hex 32)|" \
  -e "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=round-trip-client|" \
  -e "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=round-trip-secret|" \
  -e "s|^ZERO_QUERY_API_KEY=.*|ZERO_QUERY_API_KEY=$(hex 32)|" \
  -e "s|^ZERO_MUTATE_API_KEY=.*|ZERO_MUTATE_API_KEY=$(hex 32)|" \
  -e "s|^ZERO_ADMIN_PASSWORD=.*|ZERO_ADMIN_PASSWORD=$(hex 16)|" \
  -e "s|^GARAGE_ACCESS_KEY_ID=.*|GARAGE_ACCESS_KEY_ID=GK$(hex 12)|" \
  -e "s|^GARAGE_SECRET_ACCESS_KEY=.*|GARAGE_SECRET_ACCESS_KEY=$(hex 32)|" \
  -e "s|^GARAGE_RPC_SECRET=.*|GARAGE_RPC_SECRET=$(hex 32)|" \
  -e "s|^GARAGE_ADMIN_TOKEN=.*|GARAGE_ADMIN_TOKEN=$(hex 32)|" \
  "$repo_dir/.env.example" >"$env_file"
chmod 600 "$env_file"
echo "wrote $env_file"
