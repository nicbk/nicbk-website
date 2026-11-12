#!/usr/bin/env bash
# Tells the operator a unit failed, through ntfy (the one alert sink,
# research/devops-deployment/monitoring-and-observability.md). Run by the
# nicbk-website-alert@ template unit, which every job's OnFailure= names
# (flake.nix), with the failed unit's name as its argument.
#
#   deploy/alert.sh <unit-name>
#
# Environment: NTFY_URL, the topic's full URL, from the backup environment file.
#
# The message carries the unit's last journal lines, so the alert alone usually
# says what broke. A topic URL is a capability, not a secret store: nothing in
# these lines is a credential, since none of the scripts ever prints one.
set -euo pipefail

unit="${1:?usage: alert.sh <unit-name>}"
: "${NTFY_URL:?NTFY_URL is not set (see deploy/backup.env.example)}"

journal="$(journalctl --unit "$unit" --lines 25 --no-pager --output cat 2>&1 || true)"

curl -fsS \
  -H "Title: nicbk-website: $unit failed" \
  -H "Priority: high" \
  -H "Tags: warning" \
  -d "$journal" \
  "$NTFY_URL" >/dev/null
