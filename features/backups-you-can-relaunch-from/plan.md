# Plan: Backups You Can Relaunch From

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`deletions-wait-a-day`](./tasks/deletions-wait-a-day/description.md) | [#268](https://github.com/nicbk/nicbk-website/issues/268) | A deleted paper's PDF, and a deleted account's folder, are erased 24 hours later instead of at once (BK9). App code only. |
| 2 | [`a-checkpoint-every-six-hours`](./tasks/a-checkpoint-every-six-hours/description.md) | [#269](https://github.com/nicbk/nicbk-website/issues/269) | `deploy/backup.sh`, the checkpoint layout and manifest, the scratch-restore check, and the prune with its size ceiling (P32-2). Also the NixOS module's backup timer, alerts and lock, a CI round trip to a local repository, and the operator's setup runbook. |
| 3 | [`a-restore-that-relaunches`](./tasks/a-restore-that-relaunches/description.md) | [#270](https://github.com/nicbk/nicbk-website/issues/270) | `deploy/restore.sh` and `deploy/verify-restore.sh`, Zero's reset on restore, account tombstones re-applied on restore (BK10), the relaunch runbook, and CI going backup → restore → verify. |
| 4 | [`drills-and-a-watcher`](./tasks/drills-and-a-watcher/description.md) | [#271](https://github.com/nicbk/nicbk-website/issues/271) | The weekly light and monthly full drills on the node at night, the off-node freshness watcher for the relay, and the quarterly manual drill checklist. |
| 5 | [`the-images-are-kept`](./tasks/the-images-are-kept/description.md) | [#272](https://github.com/nicbk/nicbk-website/issues/272) | The pinned container images archived in the backup repository, so a relaunch does not depend on Docker Hub (BK11). |

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

## Decided with the user (2026-11-12)

The user's words: [answers](../../research/requests/2026-10-14/answers-2026-11-12.md#answers-to-p32-1-and-p32-2-as-written),
after [their comment on the spec](../../research/requests/2026-10-14/answers-2026-11-12.md#comments-on-the-32-spec-as-written).

| # | Question | Decision |
|---|---|---|
| P32-1 | How long a "deleted" backup file stays recoverable on B2. BK8's "keep only the last version" erases a hidden file after 1 day, so a compromised node could destroy the history before the daily watcher noticed | **30 days.** The lifecycle rule's `daysFromHidingToDeleting` is 30. It costs the storage of a month of pruned data, a few cents |
| P32-2 | A size ceiling on the repository, so the backup cannot grow without bound | **A ceiling of 10× the largest checkpoint of the last 30 days**, applied after the time-based policy. See [constraints](./constraints-and-behavior.md#the-size-ceiling-p32-2). **The one-year limit stays until zero-access encryption lands (#39+), and is then removed**, leaving the ceiling as the only limit on how far back history goes |

The ceiling's reference is the largest recent checkpoint, not the latest. If a
bug or an attacker empties the database, the next checkpoint is tiny, and a
ceiling of "10× the latest" would then delete the history needed to recover.

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
