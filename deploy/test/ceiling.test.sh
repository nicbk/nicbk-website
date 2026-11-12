#!/usr/bin/env bash
# Table-driven tests of the size ceiling's decision (deploy/lib/ceiling.jq).
# Run by CI, and by hand: deploy/test/ceiling.test.sh
#
# Each case is a repository state and the decision expected for it. Times are
# in days before "now", sizes in plain bytes, so a case reads as a scenario.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
ceiling="$here/../lib/ceiling.jq"
now=1800000000
day=86400
failures=0

# decide <repoBytes> <floorBytes> <snapshot>...   where a snapshot is
# id:daysAgo:bytes (bytes "-" for unmeasured). Prints the decision's
# action and id, e.g. "forget a" or "none".
decide() {
  local repo_bytes="$1" floor="$2" snapshots="[]" spec id days bytes
  shift 2
  for spec in "$@"; do
    IFS=: read -r id days bytes <<<"$spec"
    [ "$bytes" = "-" ] && bytes=null
    snapshots="$(jq --arg id "$id" --argjson time "$((now - days * day))" --argjson bytes "$bytes" \
      '. + [{id: $id, time: $time, bytes: $bytes}]' <<<"$snapshots")"
  done
  jq --null-input --argjson now "$now" --argjson repoBytes "$repo_bytes" \
    --argjson floorBytes "$floor" --argjson snapshots "$snapshots" \
    '{now: $now, repoBytes: $repoBytes, factor: 10, floorBytes: $floorBytes,
      protectSeconds: (30 * 86400), snapshots: $snapshots}' |
    jq -r --from-file "$ceiling" | jq -r '[.action, .id // empty] | join(" ")'
}

expect() {
  local name="$1" want="$2" got
  shift 2
  got="$(decide "$@")"
  if [ "$got" = "$want" ]; then
    echo "ok   $name"
  else
    echo "FAIL $name: wanted '$want', got '$got'"
    failures=$((failures + 1))
  fi
}

# Normal use: restic stores shared data once, so the repository is a little
# more than one checkpoint and the ceiling never binds.
expect "under the ceiling, nothing to do" "none" \
  120 0 old:200:- mid:40:- recent:1:100

expect "over the ceiling, the oldest goes first" "forget oldest" \
  1001 0 oldest:300:- older:200:- recent:1:100

expect "the order of the listing does not matter" "forget oldest" \
  1001 0 recent:1:100 older:200:- oldest:300:-

expect "nothing younger than 30 days is forgotten" "forget old" \
  5000 0 old:31:- young:29:- recent:1:100

expect "over the ceiling with only protected snapshots is stuck" "stuck" \
  5000 0 young:29:100 recent:1:100

# The case the rule exists for: the database emptied, so the newest checkpoint
# is tiny. The reference is the largest of the window, so the ceiling holds
# and the old history survives.
expect "an emptied database does not lower the ceiling" "none" \
  900 0 old:200:- before:3:100 emptied:0:1

expect "the floor stops thinning a small repository" "none" \
  4000 5000 old:200:- recent:1:100

expect "a lone old checkpoint is kept" "none" \
  5000 0 only:400:100

# Backups stopped a month ago: nothing to judge by, so keep everything.
expect "no recent checkpoint means no thinning" "none" \
  5000 0 old:60:- older:90:-

if [ "$failures" -gt 0 ]; then
  echo "$failures case(s) failed"
  exit 1
fi
echo "all ceiling cases passed"
