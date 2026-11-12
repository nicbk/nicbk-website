# Task: A Checkpoint Every Six Hours

Task 2 of 5 of [#32](../../description.md).

Every six hours the node takes one checked, encrypted checkpoint and sends it to
B2. Nothing in this task restores. That is task 3.

## Changes

- **`deploy/backup.sh`**, plus small sourced helpers in `deploy/lib/` (lock,
  env, alert, manifest). It runs the order in the feature's
  [constraints](../../constraints-and-behavior.md#the-order-inside-a-run-b5):
  - dump;
  - mirror;
  - scratch-restore check;
  - manifest, `.env` and tombstones file (empty until task 3);
  - `restic backup`.
  Each step says in a comment why it is in that place.
- **`deploy/prune.sh`**: the two `forget` policies, then `check`.
- **`docker-compose.yml`**: a `backup` profile with two one-shot services,
  `restic` (`restic/restic:0.19.1`) and `rclone` (a pinned
  `rclone/rclone` tag). Both are on `app-internal`, so rclone reaches Garage
  without a published port. Both mount the staging directory.
  - The restic cache is a named volume.
  - rclone is configured only by `RCLONE_CONFIG_GARAGE_*` variables, built from
    the `.env`.
  - restic's repository, password and B2 keys come from a separate,
    root-only environment file that is not the `.env`, so the app never holds
    backup credentials.
  - Neither service starts on a plain `up`.
- **`flake.nix`**: `services.nicbk-website.backup`:
  - options: `enable`, `stagingDir` (default
    `/var/lib/nicbk-website-backup`), `environmentFile`, `schedule` (default
    `00/6:00`) and `pruneSchedule` (default weekly);
  - units: `nicbk-website-backup` and `nicbk-website-prune`, as oneshot
    services with timers (`Persistent=true`);
  - `nicbk-website-alert@`, which posts to ntfy, wired as `OnFailure=` on
    every unit, the deploy unit included.
  - The deploy unit also takes the shared `flock`.
- **`.env.example`'s sibling, `deploy/backup.env.example`**, lists the backup
  environment file's keys with comments:
  - `RESTIC_REPOSITORY`;
  - `RESTIC_PASSWORD`;
  - `AWS_ACCESS_KEY_ID`;
  - `AWS_SECRET_ACCESS_KEY`;
  - `NTFY_URL`.
- **The runbook, `deploy/README-backups.md`**, linked from `README.md` and
  `research/devops-deployment/index.md`. It covers:
  - creating the bucket;
  - creating the node key (no `deleteFiles`), the watcher key (read-only) and
    the break-glass key (read-only);
  - the lifecycle rule (P32-1);
  - **the deletion-as-hide check**;
  - `restic init`;
  - the ntfy topic;
  - enabling the module in the system flake;
  - the break-glass set, with what goes where;
  - how to read an alert.
- **CI**:
  - a `shellcheck` step;
  - `docker compose --profile backup config`;
  - the first half of the "Backup round trip" job, backing up to a local
    repository and asserting the snapshot and manifest, plus the negative case.
- **Research housekeeping** (revision change 12):
  - mark the revision in `backup-and-disaster-recovery.md` as decided
    (2026-11-12, BK2), with the BK3 and BK11 planning decisions;
  - split it into a `backup-and-disaster-recovery/` folder (decision, revision,
    cost), fixing the links into it;
  - fix the `GARAGE_ADMIN_TOKEN` drift in `secrets-and-environment-config.md`.
