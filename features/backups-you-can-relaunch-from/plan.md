# Plan: Backups You Can Relaunch From

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`deletions-wait-a-day`](./tasks/deletions-wait-a-day/description.md) | — | A deleted paper's PDF, and a deleted account's folder, are erased 24 hours later instead of at once (BK9). App code only. |
| 2 | [`a-checkpoint-every-six-hours`](./tasks/a-checkpoint-every-six-hours/description.md) | — | `deploy/backup.sh`, the checkpoint layout and manifest, the scratch-restore check, and the prune. Also the NixOS module's backup timer, alerts and lock, a CI round trip to a local repository, and the operator's setup runbook. |
| 3 | [`a-restore-that-relaunches`](./tasks/a-restore-that-relaunches/description.md) | — | `deploy/restore.sh` and `deploy/verify-restore.sh`, Zero's reset on restore, account tombstones re-applied on restore (BK10), the relaunch runbook, and CI going backup → restore → verify. |
| 4 | [`drills-and-a-watcher`](./tasks/drills-and-a-watcher/description.md) | — | The weekly light and monthly full drills on the node at night, the off-node freshness watcher for the relay, and the quarterly manual drill checklist. |
| 5 | [`the-images-are-kept`](./tasks/the-images-are-kept/description.md) | — | The pinned container images archived in the backup repository, so a relaunch does not depend on Docker Hub (BK11). |

**Why this order:**

- **Task 1 first** because it closes a race that the first real checkpoint
  would otherwise have: a paper deleted between the dump and the copy. It is
  small, and it is the only task that changes what users see.
- **Task 2 before task 3.** A checkpoint can be taken and checked without a
  restore script, but a restore needs a checkpoint to read.
- **Task 3 next.** Until it lands, a checkpoint can only be restored by hand
  from the runbook.
- **Tasks 4 and 5** add proof and independence on top of a working loop.

The spec docs ride along with task 1's PR.

## Decided in planning

Two choices were delegated to planning
([decisions.md](../../research/requests/2026-10-14/decisions.md), "whatever
makes the most sense"). The reasoning for both is recorded in
[research.md](./research.md).

| # | Decision |
|---|---|
| BK3 | **Backblaze B2, through its S3 API.** The node's key has no `deleteFiles` capability, so a delete only hides a file. A lifecycle rule erases hidden files after a set number of days. That makes a compromised node unable to destroy history (BK8). R2 cannot do this: it has no versioning, and its bucket locks would break `restic prune`. Egress for the monthly full drill fits inside B2's free allowance (3× stored). At 50 GB it costs about $0.35 a month. |
| BK11 | **Archive the images.** Every image the stack runs is saved into the same restic repository as a separate `images` snapshot, but only when the set of image digests changes, at most once a day. That is about 840 MB compressed for the third-party images, roughly 1¢ a month. A relaunch can then `docker load` them if a registry is down or a tag is gone. |

Implementation choices this plan makes, each explained where it is built:

- **restic and rclone run as pinned containers** in a `backup` Compose profile,
  not as host packages. The versions then live in this repository, CI runs
  exactly what production runs, and an upgrade is a reviewed PR, like every
  other image.
- **Hand-written systemd units in this repo's `flake.nix`**, not nixpkgs'
  `services.restic.backups`. That module runs prune and check inside every
  backup and can only call into the checkout from an inline string. The deploy
  timer already uses the hand-written pattern, and the logic stays in
  `deploy/`, so it updates with each merge.
- **One lock for deploy, backup, prune and drills** (`flock`). A deploy
  restarting Postgres mid-dump would fail the run, and two restic writers would
  contend for the repository lock.
- **The check restores the dump it checks.** Each run restores its own dump into
  a scratch database inside the running Postgres container. It reads the
  manifest's counts from there, and compares every `articles.pdf_object_key`
  against the copy. So the counts and keys describe exactly the dump, not the
  live database a moment later. As a side effect it proves, every six hours,
  that the dump restores. At this size it takes seconds; revisit if the
  database grows past a few GB.
- **On restore, Zero is reset with its own tool, `zero-out`**, and the replica
  is wiped. The restored database is not trusted to describe a replication slot
  that no longer exists. Clients then re-sync, as Zero documents.

## Questions for the user

| # | Question | Recommendation |
|---|---|---|
| P32-1 | **How long a "deleted" backup file stays recoverable on B2.** BK8 was decided as "keep only the last version", which erases a hidden file after **1 day**. If the node were compromised and told to delete the backups, the history would be gone within a day. The relay watcher checks daily, so that window is racy. A **30-day** window costs the storage of one month of pruned data, a few cents. | **30 days** |

| P32-2 | **A size ceiling on the repository** (the user's comment, [as written](../../research/requests/2026-10-14/answers-2026-11-12.md#comments-on-the-32-spec-as-written)). Proposed rule, under discussion: <ul><li>the repository's stored size (`restic stats --mode raw-data`) stays at or below **10×** a reference checkpoint;</li><li>the reference is **the largest checkpoint of the last 30 days, not the latest**, so a bug or attack that empties the database cannot shrink the ceiling and delete the good history;</li><li>when over, the oldest checkpoints are forgotten one at a time and pruned until it fits;</li><li>nothing under 30 days old is ever thinned;</li><li>every time the ceiling binds, the operator is alerted;</li><li>a floor of a few GiB keeps it from thinning for savings of a fraction of a cent.</li></ul>restic has no size-based retention of its own ([forget](https://restic.readthedocs.io/en/stable/060_forget.html)), so this is a step in `prune.sh` after the time-based policy. Also open: whether history may go past 12 months when space allows (BK10: deleted accounts' data). | Ceiling as proposed; keep the 12-month limit until encryption (#39+) |

Apart from those, the go-ahead to build.

## Risks

- **B2's S3 `DeleteObject` with a key that has no `deleteFiles`.** It should hide
  the file; this is unverified from Backblaze's own docs. Restic documents that
  fallback for its native B2 backend, and a forum user runs this setup over S3.
  If the call errors instead, `restic prune` fails. The runbook's setup has a
  step for this: delete a test file with the node's key and confirm it is
  hidden, not gone, and not refused. The fallback, if refused, is to run prune
  from a machine holding a delete-capable key.
- **What `zero-out` removes.** If it drops the app's own `zero_data`
  publication, which a migration created and will not re-create, zero-cache
  would replicate nothing. The verify step asserts the publication and its
  tables. Task 3 finds out which happens and handles it.
- **Zero's event triggers in the scratch database.** They are dumped and
  restored with everything else, and fire only on DDL in that database. The
  scratch database is dropped at the end of each run. Task 2 confirms that
  nothing reaches the live database's Zero state.
- **`rclone sync --checksum` against Garage.** rclone stores its own MD5 in
  object metadata for multipart uploads; Garage's ETag behaviour there is
  undocumented. The mirror uses `--checksum` where it works, and size plus
  modification time otherwise, and task 2 measures which.
- **Disk.** The staging mirror is a second copy of every PDF on the node, and a
  full drill makes a third. BK5 says there are terabytes free.
- **The node's disk is not LUKS-encrypted (H5).** The staging directory holds a
  plaintext dump and the `.env`, readable by root, which is the same exposure
  as the Docker volumes and the `.env` themselves. What leaves the node is
  encrypted by restic.

## Dependencies

#7 (Garage, pg-boss), #11 (PDF cleanup on delete) and #31 (the account purge),
all complete. Nothing later depends on #32 to start, but every later feature
adds data that is then backed up.
