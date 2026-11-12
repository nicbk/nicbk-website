#!/usr/bin/env bash
# The weekly prune (features/backups-you-can-relaunch-from, task 2). Run by the
# nicbk-website-prune timer (flake.nix).
#
#   deploy/prune.sh <path-to-repo-checkout>
#
# Three steps, in this order:
#
# 1. **The time-based policy.** Every checkpoint of the last two days, then one
#    a day for a week, one a week for a month, one a month for a year. The
#    year is a limit until zero-access encryption (#39+), because until then
#    an old checkpoint is a readable copy of a deleted account's data (BK10).
#    That feature removes the monthly limit and leaves step 2 alone.
# 2. **The size ceiling** (P32-2): the repository stays within ten times the
#    largest checkpoint of the last 30 days, and never below a 5 GiB floor.
#    See deploy/lib/ceiling.jq for the rule and why the reference is not the
#    latest checkpoint.
# 3. **`restic check`**, so a prune that damaged the repository is found now
#    rather than at the next restore.
#
# Environment: as for backup.sh. Optionally NTFY_URL, for the notice sent when
# the ceiling removes anything, and NICBK_CEILING_FLOOR_BYTES, which CI lowers
# to exercise the ceiling on a small repository.
set -euo pipefail

repo_dir="${1:?usage: prune.sh <path-to-repo-checkout>}"
REPO_DIR="$(cd "$repo_dir" && pwd)"
# shellcheck source=deploy/lib/common.sh
. "$REPO_DIR/deploy/lib/common.sh"

require_env RESTIC_REPOSITORY RESTIC_PASSWORD
export NICBK_BACKUP_DIR="${NICBK_BACKUP_DIR:-/var/lib/nicbk-website-backup}"

readonly CEILING_FACTOR=10
readonly CEILING_FLOOR_BYTES="${NICBK_CEILING_FLOOR_BYTES:-$((5 * 1024 * 1024 * 1024))}"
readonly PROTECT_SECONDS=$((30 * 24 * 60 * 60))

take_lock

# ── 1. The time-based policy ─────────────────────────────────────────────────
# `--group-by ''` makes all checkpoints one group, so the policy is applied to
# the history as a whole whatever host or path a snapshot recorded.
log "applying the time-based policy"
restic_run forget --tag checkpoint --group-by '' \
  --keep-within 2d --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
restic_run forget --tag images --group-by '' --keep-last 4 --prune

# ── 2. The size ceiling ──────────────────────────────────────────────────────
# Each snapshot's own stored size, measured once and remembered across rounds:
# forgetting another snapshot does not change it.
declare -A snapshot_bytes=()

# The input ceiling.jq decides on: every checkpoint with its time, and the
# measured size of those in the protected window (the only ones the reference
# is taken from).
ceiling_input() {
  local now listing id time epoch snapshots="[]"
  now="$(date -u +%s)"
  listing="$(restic_run snapshots --tag checkpoint --json | jq -r '.[] | "\(.id) \(.time)"')"
  while read -r id time; do
    [ -n "$id" ] || continue
    epoch="$(date -u -d "$time" +%s)"
    if [ $((now - epoch)) -lt "$PROTECT_SECONDS" ] && [ -z "${snapshot_bytes[$id]:-}" ]; then
      snapshot_bytes[$id]="$(restic_run stats "$id" --mode raw-data --json | jq '.total_size')"
    fi
    snapshots="$(jq --arg id "$id" --argjson time "$epoch" --argjson bytes "${snapshot_bytes[$id]:-null}" \
      '. + [{id: $id, time: $time, bytes: $bytes}]' <<<"$snapshots")"
  done <<<"$listing"
  jq --null-input \
    --argjson now "$now" \
    --argjson repoBytes "$(restic_run stats --mode raw-data --json | jq '.total_size')" \
    --argjson factor "$CEILING_FACTOR" \
    --argjson floorBytes "$CEILING_FLOOR_BYTES" \
    --argjson protectSeconds "$PROTECT_SECONDS" \
    --argjson snapshots "$snapshots" \
    '{now: $now, repoBytes: $repoBytes, factor: $factor, floorBytes: $floorBytes,
      protectSeconds: $protectSeconds, snapshots: $snapshots}'
}

log "checking the size ceiling"
forgotten=()
start_bytes=""
while :; do
  input="$(ceiling_input)"
  [ -n "$start_bytes" ] || start_bytes="$(jq '.repoBytes' <<<"$input")"
  decision="$(jq --from-file "$REPO_DIR/deploy/lib/ceiling.jq" <<<"$input")"
  action="$(jq -r '.action' <<<"$decision")"
  log "repository $(jq '.repoBytes' <<<"$input") bytes, ceiling $(jq '.ceiling' <<<"$decision"): $action"
  case "$action" in
    none) break ;;
    forget)
      id="$(jq -r '.id' <<<"$decision")"
      restic_run forget "$id" --prune
      forgotten+=("$id")
      ;;
    stuck)
      # Over the ceiling with nothing left that may be removed: keep it all and
      # say so. Failing the unit is what reaches the operator (OnFailure=).
      die "the repository is over its ceiling, and every remaining checkpoint is protected; nothing was removed"
      ;;
    *) die "unexpected ceiling decision: $decision" ;;
  esac
done

if [ "${#forgotten[@]}" -gt 0 ]; then
  end_bytes="$(restic_run stats --mode raw-data --json | jq '.total_size')"
  # In normal use the ceiling never binds, because restic stores what the
  # checkpoints share once. Binding means unusual churn, worth a look.
  notify "nicbk-website: backup history thinned" \
    "The size ceiling removed ${#forgotten[@]} checkpoint(s): ${forgotten[*]}. Repository: $start_bytes -> $end_bytes bytes."
fi

# ── 3. Check ─────────────────────────────────────────────────────────────────
log "checking the repository"
restic_run check
log "prune done"
