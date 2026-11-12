#!/usr/bin/env bash
# One backup checkpoint (features/backups-you-can-relaunch-from, task 2). Run
# every six hours by the nicbk-website-backup timer (flake.nix), and by hand
# with the same arguments.
#
#   deploy/backup.sh <path-to-repo-checkout>
#
# A checkpoint is ONE restic snapshot of one staging directory, so the dump and
# the objects it refers to can never come from different runs:
#
#   staging/postgres/database.dump  pg_dump --format=custom of the app database
#   staging/objects/…               a mirror of the Garage bucket, key for key
#   staging/config/.env             the production .env
#   staging/tombstones.txt          deleted accounts' ids (task 3)
#   staging/MANIFEST.json           what the checkpoint holds, written last
#
# Environment (the backup environment file, deploy/backup.env.example):
#   RESTIC_REPOSITORY, RESTIC_PASSWORD   where the checkpoint goes
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION   B2's S3 keys
#   NICBK_BACKUP_DIR   the host directory staging lives in
#                      (default /var/lib/nicbk-website-backup)
#
# Any failing step fails the run before a snapshot is made, so a checkpoint
# that exists is one that passed every check below.
# The single-quoted `sh -c` scripts below are deliberate: their variables
# (POSTGRES_USER, $1, …) must expand inside the db container, from its own
# environment and arguments, not here on the host.
# shellcheck disable=SC2016
set -euo pipefail

repo_dir="${1:?usage: backup.sh <path-to-repo-checkout>}"
REPO_DIR="$(cd "$repo_dir" && pwd)"
# shellcheck source=deploy/lib/common.sh
. "$REPO_DIR/deploy/lib/common.sh"

require_env RESTIC_REPOSITORY RESTIC_PASSWORD
export NICBK_BACKUP_DIR="${NICBK_BACKUP_DIR:-/var/lib/nicbk-website-backup}"
staging="$NICBK_BACKUP_DIR/staging"
# Where the scratch restore goes. A fixed name, checked against the app's own
# database name below, because the check drops it at the start of every run.
check_db="nicbk_backup_check"

take_lock

# The staging directory holds a plaintext dump and the .env, so nobody but
# root reads it (the node's disk is not encrypted, H5).
umask 077
mkdir -p "$staging/postgres" "$staging/objects" "$staging/config"

app_db="$(dotenv_get POSTGRES_DB "$REPO_DIR/.env")"
bucket="$(dotenv_get GARAGE_BUCKET "$REPO_DIR/.env")"
[ "$app_db" != "$check_db" ] || die "POSTGRES_DB must not be $check_db"

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# Runs SQL in the scratch database and prints the result unaligned, one row a
# line. The connection details come from the db container's own environment.
check_sql() {
  compose exec -T db sh -c \
    'psql --username="$POSTGRES_USER" --dbname="$1" --no-psqlrc --tuples-only --no-align --quiet -v ON_ERROR_STOP=1 -c "$2"' \
    sh "$check_db" "$1"
}

drop_check_db() {
  compose exec -T db sh -c 'dropdb --username="$POSTGRES_USER" --if-exists "$1"' sh "$check_db" ||
    log "warning: could not drop $check_db"
}

# ── 1. Dump Postgres ─────────────────────────────────────────────────────────
# First, because uploads write the object before the row: every row in this
# dump has its object in the bucket by the time step 2 copies it. Deletions
# erase objects a day after the row (PHYSICAL_DELETION_DELAY_SECONDS), so a
# row deleted in between keeps its object too.
#
# Run inside the db container, so pg_dump is always the server's own version.
# Written beside the old dump and moved over it only once complete: a failed
# dump must not leave half a file where the last good one was.
log "dumping Postgres ($app_db)"
dump_started="$(now)"
rm -f "$staging/postgres/database.dump.partial"
compose exec -T db sh -c \
  'pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom' \
  >"$staging/postgres/database.dump.partial"
mv "$staging/postgres/database.dump.partial" "$staging/postgres/database.dump"
dump_finished="$(now)"

# ── 2. Mirror the bucket ─────────────────────────────────────────────────────
# Through Garage's S3 API, not its data directory, so the copy restores into a
# fresh Garage of any version through the existing garage-init. `sync` also
# removes from the mirror what the bucket no longer has, so the mirror is the
# bucket as it is now. Incremental: only new objects are downloaded.
log "mirroring bucket $bucket"
copy_started="$(now)"
rclone_run sync "garage:$bucket" /backup/staging/objects --checksum --stats-one-line -v
copy_finished="$(now)"

# ── 3. Check the dump against the mirror ─────────────────────────────────────
# The dump is restored into a scratch database and read back from there, so
# what is checked, and the counts the manifest records, describe exactly this
# dump, not the live database a moment later. As a side effect every run
# proves the dump restores.
log "restoring the dump into $check_db to check it"
trap drop_check_db EXIT
drop_check_db
compose exec -T db sh -c 'createdb --username="$POSTGRES_USER" "$1"' sh "$check_db"
compose exec -T db sh -c \
  'pg_restore --username="$POSTGRES_USER" --dbname="$1" --exit-on-error' \
  sh "$check_db" <"$staging/postgres/database.dump"

# Every article's PDF must be in the mirror. A key the mirror lacks would
# restore as a paper that cannot be opened, so it fails the run, by name.
missing="$(
  comm -23 \
    <(check_sql 'select pdf_object_key from articles' | LC_ALL=C sort) \
    <(cd "$staging/objects" && find . -type f -printf '%P\n' | LC_ALL=C sort)
)"
if [ -n "$missing" ]; then
  die "articles whose PDF is not in the bucket copy:
$missing"
fi

# Row counts of every table the app owns, as one JSON object. query_to_xml
# runs a count per table inside one statement, so no table list is kept here
# to drift out of date as migrations add tables.
row_counts="$(check_sql "
  select coalesce(json_object_agg(table_name, (xpath('/row/n/text()',
           query_to_xml(format('select count(*) as n from %I.%I', table_schema, table_name),
                        false, true, '')))[1]::text::bigint order by table_name), '{}')
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'")"
migrations="$(check_sql 'select count(*) from drizzle.__drizzle_migrations')"
drop_check_db
trap - EXIT

# ── 4. The rest of the checkpoint ────────────────────────────────────────────
cp "$REPO_DIR/.env" "$staging/config/.env"
# Deleted accounts, so restoring an older checkpoint does not bring them back.
# Written by task 3 (`deleted_account`); empty until then.
: >"$staging/tombstones.txt"

object_count="$(find "$staging/objects" -type f | wc -l)"
object_bytes="$(find "$staging/objects" -type f -printf '%s\n' | awk '{ total += $1 } END { print total + 0 }')"
git_sha="$(git -C "$REPO_DIR" rev-parse HEAD)"
# The image each running service was started from, by id, so a relaunch can
# tell whether it is running the same software.
images="$(
  compose ps --quiet | xargs --no-run-if-empty docker inspect \
    --format '{{index .Config.Labels "com.docker.compose.service"}} {{.Config.Image}} {{.Image}}' |
    jq --raw-input --slurp 'split("\n") | map(select(length > 0) | split(" ")
      | {service: .[0], image: .[1], id: .[2]}) | sort_by(.service)'
)"
restic_version="$(restic_run version | head -n 1)"
rclone_version="$(rclone_run version | head -n 1)"

jq --null-input \
  --argjson rowCounts "$row_counts" \
  --argjson images "$images" \
  --arg createdAt "$(now)" \
  --arg dumpStarted "$dump_started" --arg dumpFinished "$dump_finished" \
  --arg copyStarted "$copy_started" --arg copyFinished "$copy_finished" \
  --arg gitSha "$git_sha" \
  --argjson migrations "$migrations" \
  --argjson objectCount "$object_count" --argjson objectBytes "$object_bytes" \
  --arg bucket "$bucket" --arg database "$app_db" \
  --arg restic "$restic_version" --arg rclone "$rclone_version" \
  '{
    format: 1,
    createdAt: $createdAt,
    dump: {started: $dumpStarted, finished: $dumpFinished, database: $database},
    copy: {started: $copyStarted, finished: $copyFinished, bucket: $bucket},
    gitSha: $gitSha,
    images: $images,
    migrations: $migrations,
    rowCounts: $rowCounts,
    objectCount: $objectCount,
    objectBytes: $objectBytes,
    tools: {restic: $restic, rclone: $rclone}
  }' >"$staging/MANIFEST.json"

# ── 5. One snapshot ──────────────────────────────────────────────────────────
# Every non-zero exit fails the run, including 3 ("some source files could not
# be read"), which still leaves a snapshot behind: a checkpoint missing part of
# its staging directory is not one to restore from. restic's own exit status
# reaches `set -e` because nothing is piped.
log "taking the snapshot"
restic_run backup /backup/staging \
  --host nicbk-website --tag checkpoint --tag "sha:$git_sha" \
  --json >"$NICBK_BACKUP_DIR/last-backup.json"
snapshot_id="$(jq -r 'select(.message_type == "summary") | .snapshot_id' "$NICBK_BACKUP_DIR/last-backup.json")"

log "checkpoint $snapshot_id: $object_count objects, $object_bytes bytes, commit $git_sha"
