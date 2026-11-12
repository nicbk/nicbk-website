# Constraints and Behavior: Backups You Can Relaunch From

## What a checkpoint holds (B3)

One restic snapshot, tagged `checkpoint` and with the git sha, of one staging
directory:

| Path | What | Why it is enough |
|---|---|---|
| `postgres/<db>.dump` | `pg_dump --format=custom` of the app database, run inside the `db` container | Holds every table: Better Auth (users, sessions, accounts), the Literature Tracker, pg-boss and the `zero_data` publication. Custom format allows selective restore |
| `objects/<bucket>/…` | An `rclone sync` mirror of the Garage bucket, made through its S3 API | Restores into a fresh Garage through the existing `garage-init`. No dependence on Garage's on-disk format |
| `config/.env` | The production `.env` | Every secret the stack runs with, including `BETTER_AUTH_SECRET`, so sessions stay valid (BK13) |
| `tombstones.txt` | Ids of deleted accounts (task 3) | Lets an older checkpoint be restored without bringing deleted accounts back (BK10) |
| `MANIFEST.json` | Described below | Ties the files together and says what "restored correctly" means |

**Left out, because each is regenerated:**

- the Zero replica and replication slot (zero-cache re-syncs from Postgres);
- TLS certificates (Caddy re-issues them);
- the GPG/WKD files (public, and in git);
- the build and restic caches.

**Not in a checkpoint, but in the runbook (BK4):**

- the host's NixOS system flake;
- the WireGuard key and relay configuration;
- the break-glass set.

### The manifest

`MANIFEST.json`, written last:

- `format` (a version number for this layout);
- `createdAt`, plus the start and end of the dump and of the copy;
- `gitSha`;
- the digest of each image the stack ran;
- the number of applied migrations;
- per-table row counts, read from the scratch restore;
- `objectCount` and `objectBytes`;
- the restic and rclone versions.

## The order inside a run (B5)

1. Take the shared lock.
2. **Dump Postgres** into staging. A non-zero `pg_dump` exit fails the run.
3. **Mirror the bucket** into staging. Uploads write the object before the row,
   so every row in the dump has its object by the time of the copy. A deleted
   paper's object survives too, because of the 24-hour delay below.
4. **Check:**
   - restore the dump into a scratch database;
   - count its rows;
   - confirm that every `articles.pdf_object_key` exists in the mirror;
   - drop the scratch database.

   A missing object fails the run and names the keys.
5. **Write the manifest**, copy the `.env` in, and write the tombstones.
6. **`restic backup`** of the staging directory, with `--host nicbk-website` and
   tags `checkpoint` and the git sha. Every non-zero exit, **including 3** (some
   source unreadable), fails the run.
7. Release the lock.

## Schedule, retention and alerts (B1, B2)

- **Backup** every 6 hours (`OnCalendar=00/6:00`, `Persistent=true`, a few
  minutes of randomised delay).
- **Prune** weekly:
  - `forget --tag checkpoint --keep-within 2d --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune`;
  - `forget --tag images --keep-last 4`;
  - `check` after the prune.
- **Drills:**
  - light, weekly at night;
  - full, monthly at night;
  - both at idle CPU and I/O priority (BK6).
- **Any of these units failing** posts the unit name and the last journal lines
  to the operator's ntfy topic (`OnFailure=`), the alert sink decided in
  [monitoring-and-observability.md](../../research/devops-deployment/monitoring-and-observability.md).
- **The relay watcher** runs off the node, daily, with a read-only key and
  `restic snapshots --no-lock`. It alerts if the newest `checkpoint` snapshot is
  older than **12 hours**, or if there is none (BK12).

## Where it goes, and who can destroy it (B6, BK8)

- **The store** is a Backblaze B2 bucket, reached over S3.
- **The node's key** can list, read and write, but **cannot delete**: a delete
  hides the file.
- **A lifecycle rule** erases hidden files after N days (P32-1: 30 recommended,
  1 as decided).
- **The watcher's key** is read-only.
- **The account's own login** never touches the node.
- **The break-glass set**, kept in the operator's password manager plus a
  printed copy (BK7):
  - the restic password, which is irrecoverable if lost;
  - a read-only key;
  - the bucket URL;
  - the git remotes of this repository and of the system flake.

## Restore (B4, B5)

`deploy/restore.sh <snapshot|latest>` **replaces** state:

1. Refuses to run against a project that has data unless `--replace` is given.
2. Stops the deploy timer.
3. Takes the lock.
4. Fetches the snapshot and checks the manifest's format.
5. Checks out the manifest's git sha, so the code matches the schema.
6. Installs the `.env`.
7. Removes the volumes: database, replica and both Garage volumes.
8. Starts `db`, then runs `pg_restore --clean --if-exists --create -d postgres`.
9. Re-applies the newest tombstones it can read.
10. Runs Zero's `zero-out` and confirms that the `zero_data` publication is
    intact.
11. Starts Garage, `garage-init`, then `rclone sync` back into the bucket.
12. Brings up the stack. Migrations are a no-op, and zero-cache re-syncs.
13. Runs `deploy/verify-restore.sh`.
14. Re-enables the deploy timer, which moves the code forward to `main` through
    the normal migrations.

Running it twice with the same snapshot gives the same site.

**`verify-restore.sh` passes only if:**

- row counts and object count and bytes match the manifest;
- every `articles.pdf_object_key` has its object;
- the `zero_data` publication names its tables;
- zero-cache reports healthy;
- the `.env` has every key in `.env.example`.

## The deletion delay (BK9)

- **Deleting a paper** queues its PDF cleanup with `startAfter` of **24 hours**.
- **Deleting an account** queues its purge, from both the hook and the sweep,
  with the same delay.
- **The row goes at once.** The paper disappears from every device immediately,
  as today. Only the bytes in Garage wait.
- **Restoring an account's folder** in that window is out of scope. The delay
  protects backups, and is not an undo.

## Acceptance criteria

1. A run on the node produces one snapshot containing the dump, the mirror, the
   `.env`, the tombstones and a manifest whose counts match the database at the
   dump.
2. A run whose dump fails, whose mirror is missing an object an article names,
   or whose restic exits non-zero (3 included) produces **no** `checkpoint`
   snapshot and alerts.
3. The CI round trip passes:
   - a stack seeded with users, papers, PDFs, annotations and folds is backed
     up to a local repository;
   - it is restored into a fresh project;
   - it verifies.
4. After a restore, in a browser:
   - a user who was signed in before is still signed in;
   - their collection, a paper's PDF, its annotations and its folds are there;
   - a new upload works.
5. Restoring the same snapshot twice gives the same counts and the same verify
   result.
6. Restoring an older checkpoint does not bring back an account deleted after
   it, if a newer checkpoint recorded the deletion.
7. A deleted paper's PDF is still in the bucket 23 hours later and gone after
   24, while the paper itself is gone from the collection at once.
8. Stopping the backup timer for 12 hours makes the relay watcher alert.
9. Prune leaves the retention described above and `restic check` passes.
10. A relaunch on a machine with no registry access succeeds from the archived
    images.
