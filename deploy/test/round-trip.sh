#!/usr/bin/env bash
# The backup round trip (features/backups-you-can-relaunch-from, testing.md),
# run by CI's "Backup round trip" job and by hand:
#
#   deploy/test/round-trip.sh <path-to-repo-checkout>
#
# Runs the real scripts in deploy/ against a real, throwaway copy of the stack
# (its own Compose project and volumes), backing up to a local restic
# repository instead of B2. Needs Docker, jq, openssl, and a .env (CI writes one
# with deploy/test/make-test-env.sh). Leaves nothing behind.
#
# What it proves, in order:
#   1. a run on a seeded stack makes one checkpoint whose manifest matches the
#      database, and `restic check` passes;
#   2. a run where an article's PDF is missing fails, names the key, and makes
#      no snapshot;
#   3. the size ceiling thins a repository over it, oldest first, never within
#      30 days, and an emptied database does not lower it;
#   4. with zero-cache replicating, a checkpoint (and its scratch restore)
#      leaves Zero alone: no restart, no reset, the same schemas, slot and
#      event triggers.
#
# NICBK_ROUND_TRIP_SKIP_ZERO=1 skips 4, for machines whose containers have no
# IPv6 (zero-cache listens on ::). CI runs it.
# The single-quoted `sh -c` scripts below are deliberate: their variables
# (POSTGRES_USER, $1, …) must expand inside the db container, from its own
# environment and arguments, not here on the host.
# shellcheck disable=SC2016
set -euo pipefail

repo_dir="${1:?usage: round-trip.sh <path-to-repo-checkout>}"
REPO_DIR="$(cd "$repo_dir" && pwd)"
# shellcheck source=deploy/lib/common.sh
. "$REPO_DIR/deploy/lib/common.sh"

[ -f "$REPO_DIR/.env" ] || die "no .env; for a throwaway one run deploy/test/make-test-env.sh"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-nicbk-round-trip}"
[ "$COMPOSE_PROJECT_NAME" != "nicbk-website" ] || die "refusing to run against the production project"
work="$(mktemp -d)"
export NICBK_BACKUP_DIR="$work/backup"
export NICBK_LOCK_FILE="$work/lock"
# A local repository inside the backup directory, which the restic service
# mounts at /backup. The password is this test's alone.
export RESTIC_REPOSITORY=/backup/repo
export RESTIC_PASSWORD=round-trip-only
unset NTFY_URL AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION
mkdir -p "$NICBK_BACKUP_DIR"

cleanup() {
  log "cleaning up"
  # The containers wrote into the backup directory as root, so a container
  # removes it too.
  compose --profile backup run --rm -T --no-deps --entrypoint sh rclone \
    -c 'rm -rf /backup/* /backup/.[!.]*' >/dev/null 2>&1 || true
  compose --profile backup down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$work" 2>/dev/null || true
}
trap cleanup EXIT

fail() { die "round trip: $*"; }

psql_app() {
  compose exec -T db sh -c \
    'psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --no-psqlrc --tuples-only --no-align --quiet -v ON_ERROR_STOP=1 "$@"' sh "$@"
}

bucket="$(dotenv_get GARAGE_BUCKET "$REPO_DIR/.env")"

# ── The stack ────────────────────────────────────────────────────────────────
log "starting a throwaway stack ($COMPOSE_PROJECT_NAME)"
compose up -d --wait db garage
# `run` builds the app image the two one-shot jobs share, if it is not built.
compose run --rm migrate
compose run --rm garage-init

log "seeding"
psql_app <"$REPO_DIR/deploy/test/seed.sql"
mkdir -p "$NICBK_BACKUP_DIR/seed"
while read -r key; do
  file="$NICBK_BACKUP_DIR/seed/$(basename "$(dirname "$key")").pdf"
  printf '%%PDF-1.7\n%% round trip %s\n%%%%EOF\n' "$key" >"$file"
  rclone_run copyto "/backup/seed/$(basename "$file")" "garage:$bucket/$key"
done < <(psql_app -c 'select pdf_object_key from articles')

# zero-cache replicating from the database, as in production, so case 4 can
# show the checkpoint does not disturb it.
check_zero="${NICBK_ROUND_TRIP_SKIP_ZERO:-0}"
zero_state() {
  psql_app -c "
    select 'schemas ' || string_agg(nspname, ',' order by nspname) from pg_namespace where nspname like 'zero%';
    select 'slots ' || string_agg(slot_name || '=' || active, ',' order by slot_name) from pg_replication_slots;
    select 'triggers ' || string_agg(evtname, ',' order by evtname) from pg_event_trigger;"
}
if [ "$check_zero" != 1 ]; then
  log "starting zero-cache"
  compose up -d --wait zero-cache
  zero_before="$(zero_state)"
  log "Zero before: $(tr '\n' ' ' <<<"$zero_before")"
  # Compared before and after, rather than required to be zero: a first start
  # may well talk about syncing, and only a change during the checkpoint counts.
  zero_resets() { compose logs zero-cache 2>&1 | grep -ci 'reset\|resync' || true; }
  resets_before="$(zero_resets)"
fi

restic_run init

snapshot_count() { restic_run snapshots --tag checkpoint --json | jq 'length'; }

# ── 2. A missing PDF fails the run ───────────────────────────────────────────
# First, so the repository is still empty: a snapshot after it can only have
# come from this run.
log "case: an article whose PDF is missing"
orphan_key='lit-tracker/roundTripUserB000000000000000000/00000000-0000-4000-8000-0000000000dd/source.pdf'
psql_app -c "insert into articles (id, user_id, title, authors, pdf_object_key)
  values ('00000000-0000-4000-8000-0000000000dd', 'roundTripUserB000000000000000000',
          'A Paper Whose PDF Is Gone', '[]', '$orphan_key')"
if output="$("$REPO_DIR/deploy/backup.sh" "$REPO_DIR" 2>&1)"; then
  fail "the backup succeeded with a PDF missing"
fi
grep -qF "$orphan_key" <<<"$output" || fail "the failure did not name the missing key: $output"
[ "$(snapshot_count)" = 0 ] || fail "a snapshot was made despite the failure"
psql_app -c "delete from articles where id = '00000000-0000-4000-8000-0000000000dd'"
log "ok: the run failed, named the key, and made no snapshot"

# ── 1. A checkpoint ──────────────────────────────────────────────────────────
log "case: a checkpoint of the seeded stack"
"$REPO_DIR/deploy/backup.sh" "$REPO_DIR"
[ "$(snapshot_count)" = 1 ] || fail "expected one checkpoint"

manifest="$(restic_run dump latest /backup/staging/MANIFEST.json)"
live_counts="$(psql_app -c "
  select coalesce(json_object_agg(table_name, (xpath('/row/n/text()',
           query_to_xml(format('select count(*) as n from %I.%I', table_schema, table_name),
                        false, true, '')))[1]::text::bigint order by table_name), '{}')
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'")"
jq --exit-status --argjson live "$live_counts" '.rowCounts == $live' <<<"$manifest" >/dev/null ||
  fail "manifest row counts differ from the database: $(jq -c .rowCounts <<<"$manifest") vs $live_counts"
jq --exit-status '.objectCount == 3 and .rowCounts.articles == 3 and .rowCounts.session == 2
  and .format == 1 and (.gitSha | length) == 40 and .migrations > 0' <<<"$manifest" >/dev/null ||
  fail "unexpected manifest: $manifest"
# Listed once and searched afterwards: `grep -q` on a live pipe would stop
# reading early, and the broken pipe would fail restic under pipefail.
listing="$(restic_run ls latest)"
for path in postgres/database.dump config/.env tombstones.txt MANIFEST.json; do
  grep -qx "/backup/staging/$path" <<<"$listing" || fail "the checkpoint is missing $path"
done
restic_run check
log "ok: one checkpoint, its manifest matches the database"

# ── 4. Zero is undisturbed ───────────────────────────────────────────────────
if [ "$check_zero" != 1 ]; then
  zero_after="$(zero_state)"
  [ "$zero_after" = "$zero_before" ] ||
    fail "Zero's state changed across the checkpoint: before $zero_before, after $zero_after"
  container="$(compose ps --quiet zero-cache)"
  [ "$(docker inspect --format '{{.RestartCount}} {{.State.Health.Status}}' "$container")" = "0 healthy" ] ||
    fail "zero-cache restarted or is unhealthy after the checkpoint"
  [ "$(zero_resets)" = "$resets_before" ] || fail "zero-cache reset or re-synced during the checkpoint"
  log "ok: Zero undisturbed by the checkpoint"
fi

# A second run adds a checkpoint that shares nearly everything with the first.
"$REPO_DIR/deploy/backup.sh" "$REPO_DIR"
[ "$(snapshot_count)" = 2 ] || fail "expected two checkpoints"

# ── 3. The size ceiling ──────────────────────────────────────────────────────
# A separate repository of synthetic, backdated checkpoints of random (so
# incompressible, undeduplicable) data, sized so the ceiling binds:
#
#   five old monthly checkpoints, 6 MB each      (300 … 60 days ago)
#   one recent checkpoint before the "emptying", 2 MB   (20 days ago)
#   the newest, after the database was emptied, ~0 MB    (1 day ago)
#
# The reference is the largest recent checkpoint (2 MB), so the ceiling is
# 20 MB: the oldest old ones go until the rest fits, and the 60-day one
# survives. Had the reference been the newest, the ceiling would be ~0 and
# every old one would go.
log "case: the size ceiling"
export RESTIC_REPOSITORY=/backup/ceiling-repo
restic_run init
make_checkpoint() {
  local name="$1" days_ago="$2" megabytes="$3"
  mkdir -p "$NICBK_BACKUP_DIR/ceiling/$name"
  head -c "$((megabytes * 1024 * 1024))" /dev/urandom >"$NICBK_BACKUP_DIR/ceiling/$name/data"
  restic_run backup "/backup/ceiling/$name" --host nicbk-website --tag checkpoint \
    --tag "test:$name" --time "$(date -u -d "-$days_ago days" '+%Y-%m-%d %H:%M:%S')" >/dev/null
}
make_checkpoint old300 300 6
make_checkpoint old240 240 6
make_checkpoint old180 180 6
make_checkpoint old120 120 6
make_checkpoint old60 60 6
make_checkpoint before 20 2
head -c 1024 /dev/urandom >"$NICBK_BACKUP_DIR/ceiling/emptied" && mkdir -p "$NICBK_BACKUP_DIR/ceiling/emptied.d" &&
  mv "$NICBK_BACKUP_DIR/ceiling/emptied" "$NICBK_BACKUP_DIR/ceiling/emptied.d/data"
restic_run backup /backup/ceiling/emptied.d --host nicbk-website --tag checkpoint --tag test:emptied \
  --time "$(date -u -d '-1 days' '+%Y-%m-%d %H:%M:%S')" >/dev/null

NICBK_CEILING_FLOOR_BYTES=0 "$REPO_DIR/deploy/prune.sh" "$REPO_DIR"

remaining="$(restic_run snapshots --tag checkpoint --json | jq -r '[.[].tags[] | select(startswith("test:"))] | sort | join(" ")')"
log "left after the ceiling: $remaining"
for kept in test:before test:emptied test:old60; do
  grep -qw "$kept" <<<"$remaining" || fail "the ceiling removed $kept: left $remaining"
done
grep -qw test:old300 <<<"$remaining" && fail "the ceiling kept the oldest: left $remaining"
repo_bytes="$(restic_run stats --mode raw-data --json | jq '.total_size')"
[ "$repo_bytes" -le $((20 * 1024 * 1024 + 1024 * 1024)) ] ||
  fail "the repository is still over its ceiling: $repo_bytes bytes"
log "ok: thinned oldest first to $repo_bytes bytes, kept the recent window and the 60-day checkpoint"

log "round trip passed"
