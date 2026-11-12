# shellcheck shell=bash
#
# Shared by the scripts in deploy/: logging, the one lock every job on this
# host takes, and the Compose and backup-tool wrappers. Sourced, never run.
#
# Callers set `REPO_DIR` (the checkout docker-compose.yml lives in) before
# sourcing, and run under `set -euo pipefail`.

# Timestamped, to stderr, so a script's stdout stays free for data and the
# journal shows when each step happened.
log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >&2
}

die() {
  log "error: $*"
  exit 1
}

# Fails, naming the variable, unless every named variable is set and non-empty.
# The backup environment file is provisioned by hand, so a missing key is the
# likeliest misconfiguration and should say so rather than surface as a
# restic error several steps later.
require_env() {
  local name
  for name in "$@"; do
    if [ -z "${!name:-}" ]; then
      die "$name is not set (see deploy/backup.env.example)"
    fi
  done
}

# **One lock for deploy, backup, prune and the drills.** A deploy restarts
# Postgres and Garage, which would fail a backup halfway through its dump or
# copy, and two restic writers would contend for the repository's own lock.
# So every job takes this one and waits its turn; none of them is urgent
# enough to justify interrupting another.
#
# The lock is held on file descriptor 9 until the script exits, so there is no
# release step to forget. The path is configurable for CI and local runs, which
# have no /run/lock of their own to share.
take_lock() {
  local lock_file="${NICBK_LOCK_FILE:-/run/lock/nicbk-website.lock}"
  exec 9>"$lock_file"
  log "waiting for the lock ($lock_file)"
  flock 9
  log "lock taken"
}

# The production Compose file, explicitly: `-f` stops a stray
# docker-compose.override.yml (dev/HMR) from merging in, exactly as deploy.sh
# does. The project name comes from COMPOSE_PROJECT_NAME when set, which is how
# CI and the drills run a second copy of the stack beside production.
#
# NICBK_COMPOSE_OVERRIDE names one more Compose file to layer on top, for
# running beside production rather than as it: the drills' file, which drops
# every published port (task 4), or a local test's. Production never sets it.
compose() {
  local files=(-f "$REPO_DIR/docker-compose.yml")
  if [ -n "${NICBK_COMPOSE_OVERRIDE:-}" ]; then
    files+=(-f "$NICBK_COMPOSE_OVERRIDE")
  fi
  docker compose "${files[@]}" --project-directory "$REPO_DIR" "$@"
}

# restic and rclone, run as the pinned one-shot services of the `backup`
# profile (docker-compose.yml) rather than as host binaries, so their versions
# are reviewed in this repository and CI runs exactly what production runs.
#
# **Stdin is closed on purpose.** `docker compose run` attaches stdin by
# default, so a call inside a `while read` loop would swallow the rest of the
# loop's input: found when seeding uploaded one PDF of three. Neither tool is
# ever fed through stdin here.
restic_run() {
  compose --profile backup run --rm -T --no-deps restic "$@" </dev/null
}

rclone_run() {
  compose --profile backup run --rm -T --no-deps rclone "$@" </dev/null
}

# One value from a dotenv file, without sourcing it: the app's .env is data,
# and sourcing would execute anything written into it. Handles the plain
# KEY=value lines .env.example uses, with optional matching quotes.
dotenv_get() {
  local key="$1" file="$2" line value
  line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
  [ -n "$line" ] || die "$key is not set in $file"
  value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

# Posts a short message to the operator's ntfy topic, if one is configured.
# Used for news that is not a failure (the size ceiling removing history);
# failures reach ntfy through systemd's OnFailure= and deploy/alert.sh instead.
notify() {
  local title="$1" message="$2"
  if [ -z "${NTFY_URL:-}" ]; then
    log "notify (no NTFY_URL set): $title: $message"
    return 0
  fi
  curl -fsS -H "Title: $title" -d "$message" "$NTFY_URL" >/dev/null ||
    log "warning: could not post to ntfy: $title"
}
