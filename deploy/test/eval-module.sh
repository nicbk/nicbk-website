#!/usr/bin/env bash
# Checks the NixOS module (flake.nix) evaluates, with backups on and off, and
# that it generates the backup feature's units as intended. Run by CI and by
# hand: deploy/test/eval-module.sh <path-to-repo-checkout>. Needs Nix.
set -euo pipefail

repo_dir="$(cd "${1:?usage: eval-module.sh <path-to-repo-checkout>}" && pwd)"
here="$repo_dir/deploy/test"

evaluate() {
  nix --extra-experimental-features 'nix-command flakes' eval --impure --json \
    --expr "import $here/eval-module.nix { repo = $repo_dir; backup = $1; }"
}

check() {
  local name="$1" filter="$2" json="$3"
  if jq --exit-status "$filter" <<<"$json" >/dev/null; then
    echo "ok   $name"
  else
    echo "FAIL $name"
    jq . <<<"$json"
    exit 1
  fi
}

on="$(evaluate true)"
check "the backup runs deploy/backup.sh from the checkout" \
  '.backup.exec | endswith("/deploy/backup.sh /var/lib/nicbk-website")' "$on"
check "the prune runs deploy/prune.sh" '.prune.exec | endswith("/deploy/prune.sh /var/lib/nicbk-website")' "$on"
check "both read the backup environment file" \
  '[.backup, .prune, .alert] | all(.environmentFile == "/var/lib/nicbk-website-backup/backup.env")' "$on"
check "every job, the deploy included, alerts on failure" \
  '[.backup, .prune, .deploy] | all(.onFailure == ["nicbk-website-alert@%n.service"])' "$on"
check "a checkpoint every six hours, caught up after downtime" \
  '.backupTimer.OnCalendar == "00/6:00" and .backupTimer.Persistent' "$on"
check "a weekly prune" '.pruneTimer.OnCalendar == "Sun 03:30"' "$on"

off="$(evaluate false)"
check "without backups, no backup units and no alert hook" \
  '.backup == null and .prune == null and .alert == null and .deploy.onFailure == []' "$off"
echo "the module evaluates as intended"
