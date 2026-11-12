# Status: A Checkpoint Every Six Hours

**State:** In review ([#269](https://github.com/nicbk/nicbk-website/issues/269)).

## What shipped

- **`deploy/backup.sh`**, in the specified order:
  - dump Postgres (`pg_dump -Fc` inside the db container, written beside the
    last good dump and moved over it only when complete);
  - mirror the bucket (`rclone sync --checksum` through Garage's S3 API);
  - restore the dump into a scratch database (`nicbk_backup_check`), check
    every `articles.pdf_object_key` against the mirror, and read the counts
    from there;
  - write the manifest, `.env` and tombstones file (empty until task 3);
  - one `restic backup`, where any non-zero exit fails.
- **`deploy/prune.sh`**:
  - the time-based policy (`--keep-within 2d --keep-daily 7 --keep-weekly 4 --keep-monthly 12`);
  - the images' `--keep-last 4`;
  - the size ceiling, looping decide → forget one → prune → measure, and
    sending an ntfy notice when it removes anything;
  - `restic check`.
- **`deploy/lib/ceiling.jq`**: the ceiling's rule as a pure function. One rule
  was added in building: **with no checkpoint in the last 30 days it removes
  nothing**, since otherwise the reference would be zero and a month of broken
  backups would thin history to the floor.
- **`deploy/lib/common.sh`**:
  - logging and `require_env`;
  - the one `flock` lock;
  - `compose` (with an optional `NICBK_COMPOSE_OVERRIDE` for the drills and
    local tests);
  - the restic and rclone wrappers, whose **stdin is closed**: inside a
    `while read` loop, `docker compose run` swallowed the loop's input;
  - `dotenv_get`, which reads a value without sourcing the `.env`;
  - `notify`.
- **`deploy/alert.sh`**: a failed unit's last 25 journal lines to ntfy.
- **`deploy/restic.sh`**: restic by hand with the backup credentials, for the
  operator.
- **`deploy/deploy.sh`** takes the same lock.
- **`docker-compose.yml`**: `restic` (`restic/restic:0.19.1`) and `rclone`
  (`rclone/rclone:1.75.2`) in a `backup` profile, on `app-internal`.
  - restic's credentials are passed through from the caller's environment,
    never from the app's `.env`.
  - rclone is configured entirely by `RCLONE_CONFIG_GARAGE_*` variables.
  - A `restic-cache` volume holds restic's index cache.
- **`flake.nix`**: `services.nicbk-website.backup`:
  - options: `enable`, `stateDir`, `environmentFile`, `schedule` and
    `pruneSchedule`;
  - the backup and prune services and timers (`Persistent=true`, 5 minutes'
    randomised delay, `UMask=0077`);
  - `nicbk-website-alert@`, as `OnFailure=` on every job, the deploy included;
  - a tmpfiles rule for the state directory;
  - `util-linux` on the deploy unit's path.
- **`deploy/backup.env.example`**, and the runbook **`deploy/README-backups.md`**
  (linked from `README.md` and `research/devops-deployment/index.md`).
- **CI**, a new job "Backups (shellcheck, NixOS module, round trip)":
  - shellcheck;
  - the ceiling's table tests;
  - the module evaluated in a NixOS 26.05 system, with backups on and off;
  - both Compose profiles validated;
  - `deploy/test/round-trip.sh`.
- **Research housekeeping:**
  - `backup-and-disaster-recovery.md` is now a folder:
    - `index.md`, the decision;
    - `revision-2026-10-14.md`, marked decided;
    - `planning-2026-11-12.md`, BK3, BK11, P32-1 and P32-2.
  - Every link into the old file (27, and one code comment) is updated.
  - The `GARAGE_ADMIN_TOKEN` drift is noted in
    `secrets-and-environment-config.md`.

## Verified

- **The round trip, locally**, passed every case:
  - a missing PDF fails the run, names the key, and leaves no snapshot;
  - a good run makes one checkpoint whose manifest row counts equal the live
    database's, with the dump, mirror, `.env`, tombstones and manifest in it,
    and `restic check` passes;
  - a second run adds a second checkpoint;
  - the ceiling, on a synthetic repository of backdated checkpoints, removed
    the two oldest (300 and 240 days) and stopped at 20.0 MB under a 20.0 MB
    ceiling. It kept the 60-day checkpoint, the 20-day one and the "emptied"
    newest.
- **`rclone sync --checksum` against Garage compares real hashes.**
  - Garage's MD5 for an object equals the file's.
  - Replacing an object with different content of the same size, with the
    mirror's copy made to look newer, was picked up by the next sync.
  - The app uploads with a single `PutObject`, so every PDF's ETag is its MD5.
- **The NixOS module evaluates** in a real NixOS 26.05 system, with backups on
  and off (`deploy/test/eval-module.sh`):
  - with backups on: the expected services, timers, environment file and
    alert hooks;
  - with backups off: no backup units, and no alert hook on the deploy.
- **shellcheck 0.11** is clean over every script. The single-quoted `sh -c`
  scripts carry a file-level SC2016 disable with the reason.
- **The scratch-restore check's time:** about 2 seconds on the seeded data.
  Revisit if the database grows past a few GB.

## Not verified here, and where it is

- **Zero undisturbed by a checkpoint.** zero-cache cannot start in this sandbox
  (its containers have no IPv6, and it listens on `::`). The round trip
  therefore has a fourth case, run in CI and skipped locally with
  `NICBK_ROUND_TRIP_SKIP_ZERO=1`. With zero-cache replicating, it asserts that
  a checkpoint changes nothing of Zero's:
  - the schemas, replication slots and event triggers are the same;
  - zero-cache has no restart, and is still healthy;
  - no new reset or re-sync lines appear in its log.
- **The app image build** could not run in this sandbox (npm in `docker build`
  cannot reach the registry through the sandbox proxy). Locally, `migrate` and
  `garage-init` ran from the checkout through an override file. CI builds the
  real image.
- **On the node, after merge, by the operator** (runbook steps 1–6):
  - the B2 bucket and keys;
  - the deletion-as-hide check;
  - the first real checkpoints;
  - the alert.
