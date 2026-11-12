#!/usr/bin/env bash
# restic, by hand, against the backup repository: the same pinned image and
# credentials the timers use. For the operator (deploy/README-backups.md).
#
#   sudo deploy/restic.sh <path-to-repo-checkout> <restic arguments…>
#   sudo deploy/restic.sh /var/lib/nicbk-website snapshots
#
# Reads the backup environment file from NICBK_BACKUP_ENV_FILE (default
# /var/lib/nicbk-website-backup/backup.env). The backup directory is mounted
# at /backup, so `restore … --target /backup/restore` lands in
# /var/lib/nicbk-website-backup/restore on the host.
set -euo pipefail

repo_dir="${1:?usage: restic.sh <path-to-repo-checkout> <restic arguments…>}"
shift
REPO_DIR="$(cd "$repo_dir" && pwd)"
# shellcheck source=deploy/lib/common.sh
. "$REPO_DIR/deploy/lib/common.sh"

env_file="${NICBK_BACKUP_ENV_FILE:-/var/lib/nicbk-website-backup/backup.env}"
[ -r "$env_file" ] || die "cannot read $env_file (run as root, or set NICBK_BACKUP_ENV_FILE)"
# The operator's own root-only file of KEY=value lines, written by hand, so
# sourcing it is reading configuration the operator wrote, not foreign data.
set -a
# shellcheck disable=SC1090
. "$env_file"
set +a
export NICBK_BACKUP_DIR="${NICBK_BACKUP_DIR:-/var/lib/nicbk-website-backup}"
require_env RESTIC_REPOSITORY RESTIC_PASSWORD

restic_run "$@"
