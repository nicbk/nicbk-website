# The size ceiling's decision (features/backups-you-can-relaunch-from, P32-2):
# given the repository as it stands, what to forget next, if anything.
#
# A pure function, so it can be tested on its own (deploy/test/ceiling.test.sh)
# and deploy/prune.sh only loops: decide, forget one, prune, measure, decide.
#
# Input:
#   {
#     now:            seconds since the epoch,
#     repoBytes:      the repository's stored size (restic stats --mode raw-data),
#     factor:         10,
#     floorBytes:     the ceiling is never lower than this,
#     protectSeconds: snapshots younger than this are never forgotten (30 days),
#     snapshots: [ { id, time: seconds since the epoch, bytes: stored size of
#                    that snapshot alone, or null where it was not measured } ]
#   }
#
# Output: { action: "none" | "forget" | "stuck", ceiling, reference, id? }
#
# **The reference is the largest recent checkpoint, not the latest.** If a bug
# or an attacker empties the database, the next checkpoint is tiny; a ceiling
# of "ten times the latest" would then forget the very history needed to
# recover. The largest of the protected window cannot fall that way, and the
# window itself is never thinned.

. as $input
| $input.now as $now
| $input.protectSeconds as $protect
| ($input.snapshots | sort_by(.time)) as $snapshots
| ($snapshots | map(select($now - .time < $protect))) as $recent
| ($recent | map(.bytes // 0) | max // 0) as $reference
| ([$input.floorBytes, $input.factor * $reference] | max) as $ceiling
| {ceiling: $ceiling, reference: $reference}
| if ($recent | length) == 0 then
    # No checkpoint in the window means backups have stopped, and the watcher
    # is already alerting. There is no reference to judge size against, and
    # thinning now would spend the history while nothing replaces it.
    . + {action: "none", reason: "no recent checkpoint"}
  elif $input.repoBytes <= $ceiling then
    . + {action: "none"}
  else
    # The oldest snapshot outside the protected window that is not the newest
    # of all. The newest is excluded on its own account too, so a clock gone
    # wrong cannot make the only good checkpoint "old".
    ($snapshots | (last.id // null) as $newest
      | map(select($now - .time >= $protect and .id != $newest))
      | first) as $candidate
    | if $candidate == null then
        . + {action: "stuck"}
      else
        . + {action: "forget", id: $candidate.id}
      end
  end
