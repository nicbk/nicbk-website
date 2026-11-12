# Research: Backups You Can Relaunch From

## Decided research this implements

- [backup-and-disaster-recovery.md](../../research/devops-deployment/backup-and-disaster-recovery.md):
  - the decision (restic, a systemd timer, an off-site S3-compatible store, GFS
    retention, no WAL recovery, `restic check`);
  - the 2026-10-14 revision, changes 1–12, approved as BK2.
- [decisions.md](../../research/requests/2026-10-14/decisions.md), as answered
  in [answers-2026-11-12.md](../../research/requests/2026-10-14/answers-2026-11-12.md):
  - BK1: every 6 hours; that is "immediately";
  - BK4: the host's pieces are named in the runbook;
  - BK5: terabytes free;
  - BK6: drills on the node at night;
  - BK7: password manager plus a printed copy;
  - BK8: the cheap tier;
  - BK9: delay physical deletion;
  - BK10: tombstones, and disclose;
  - BK12: a watcher on the relay;
  - BK13: users stay signed in;
  - BK3 and BK11: delegated, decided below.
- [deployment-strategy.md](../../research/devops-deployment/deployment-strategy.md):
  the pull-based timer pattern this extends.
- [monitoring-and-observability.md](../../research/devops-deployment/monitoring-and-observability.md):
  ntfy as the one alert sink.
- [high-level-guidance/design/DESIGN.md](../../high-level-guidance/design/DESIGN.md):
  the open-source stack. restic (BSD-2) and rclone (MIT) are open source. B2 is
  a hosting cost, as the relay is (the decision's own reasoning).
- H5 (`allowReboot = true`, no LUKS): the staging directory's exposure, in
  [plan.md](./plan.md#risks).

## Research done for planning (2026-11-12)

Fetched again for this spec, as AGENTS.md requires after the compaction.
Anything not confirmed from a primary source is marked *unverified*.

### BK3: B2 over R2

- **B2 application keys** have separate `listFiles`, `readFiles`, `writeFiles`
  and `deleteFiles` capabilities. Hiding a file falls under `writeFiles`
  ([capabilities](https://www.backblaze.com/docs/cloud-storage-application-key-capabilities)).
- **B2 lifecycle rules:**
  - `daysFromHidingToDeleting` erases hidden versions after N days;
  - "Keep only the last version" is that value set to 1;
  - rules run daily
    ([lifecycle rules](https://www.backblaze.com/docs/cloud-storage-lifecycle-rules)).
- **restic on B2:**
  - restic recommends the S3 backend for B2;
  - over S3, deletes become hides, and restic tells you to set the
    lifecycle rule;
  - its native backend falls back to hiding when the key lacks delete
    ([preparing a repository](https://github.com/restic/restic/blob/master/doc/030_preparing_a_new_repo.rst));
  - restic 0.15.0's changelog suggests a key without `deleteFiles` for exactly
    this purpose
    ([issue 2134](https://git.0l.de/Mirrors/restic/raw/branch/master/changelog/0.15.0_2023-01-12/issue-2134)).
  - *Unverified:* S3 `DeleteObject` succeeding as a hide with such a key. The
    runbook tests it, see [plan.md](./plan.md#risks).
- **R2:**
  - versioning and S3 Object Lock are unimplemented
    ([S3 API](https://developers.cloudflare.com/r2/api/s3/api/)), so a
    read/write token can delete everything;
  - its bucket locks reject delete and overwrite
    ([bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)),
    which would make `restic prune` fail on locked packs (inferred).
- **Prices** (vendor pages, 2026-11-12):
  - **B2:**
    - $6.95/TB-month;
    - first 10 GB free;
    - egress free up to 3× average stored, then $0.01/GB;
    - class A–C calls free
    ([B2 pricing](https://www.backblaze.com/cloud-storage/pricing)).
  - **R2:**
    - $0.015/GB-month;
    - egress free;
    - 10 GB free
    ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)).
  - At 50 GB, B2 is about $0.35 a month and R2 about $0.75.
  - A monthly full drill (about 1× stored) fits inside B2's free egress.

### BK11: archive the images

- **Compressed amd64 sizes**, from the Docker Hub API:
  - `postgres:18.4`: about 162 MB;
  - `rocicorp/zero:1.8.0`: about 142 MB;
  - `dxflrs/garage:v2.3.0`: about 28 MB;
  - `grobid/grobid:0.9.1-crf`: about 510 MB;
  - about 840 MB together.
- *Unverified:* that restic de-duplicates a re-saved, unchanged `docker save`
  tar. restic chunks by content, so it should. Task 5 measures it with two
  saves.
- **Why archive:** a relaunch is exactly when a registry outage, a rate limit or
  a deleted tag would hurt most. The cost is cents. Saving only when the digest
  set changes keeps the six-hourly checkpoint small.

### The NixOS module: hand-written units

- nixpkgs' `services.restic.backups.<name>`
  ([source](https://raw.githubusercontent.com/NixOS/nixpkgs/master/nixos/modules/services/backup/restic.nix))
  generates one oneshot unit:
  - prepare, then initialize, then `backup`, then `forget --prune`, then
    `check`, all in sequence;
  - no separate prune schedule within one entry;
  - no `OnFailure`;
  - nothing special for exit code 3.
- Its staging hook is an inline string. Calling `deploy/backup.sh` from it would
  leave the module as a wrapper around our script, while still running prune on
  every backup. So the units are hand-written, as the deploy unit is.

### restic and rclone

- **restic 0.19.1** is current (2026-07-05,
  [releases](https://github.com/restic/restic/releases)).
- **Exit codes**
  ([scripting](https://restic.readthedocs.io/en/stable/075_scripting.html)):
  - 3: some source unreadable, but a snapshot is still made;
  - 10: no repository;
  - 11: lock failed;
  - 12: wrong password.
- **`check --read-data-subset n/t`** checks a deterministic group, and rotating
  `n` covers the whole repository
  ([working with repositories](https://restic.readthedocs.io/en/stable/045_working_with_repos.html)).
- **`forget --keep-within`** is measured from the newest snapshot, and prune
  locks the repository
  ([forget](https://restic.readthedocs.io/en/stable/060_forget.html)).
- **rclone against Garage:**
  - `provider = Other`, path-style, region from Garage's config
    ([Garage CLI guide](https://garagehq.deuxfleurs.fr/documentation/connect/cli/));
  - configured entirely by `RCLONE_CONFIG_<NAME>_*` environment variables
    ([rclone docs](https://rclone.org/docs/)), so no config file holds a secret;
  - for multipart objects, `--checksum` relies on rclone's own MD5 metadata
    ([rclone S3](https://rclone.org/s3/)); Garage's behaviour there is
    unverified.

### Restoring under Zero and pg-boss

- **Zero's schemas** are `zero` (app), `zero_0` (shard: clients and mutation
  ids), `zero_0/cvr` and `zero_0/cdc`
  ([zero-cache config](https://zero.rocicorp.dev/docs/zero-cache-config)).
- **"It is always safe to wipe the replica… Downstream zero-clients will get
  re-synced when they connect"**
  ([replication](https://zero.rocicorp.dev/docs/debug/replication)).
- **`zero-out`** removes all traces of Zero from Postgres
  ([zero-out](https://zero.rocicorp.dev/docs/debug/zero-out)).
  *Unverified:* whether that includes an app-named publication.
- **Undocumented:** restoring from a dump, and last-mutation-id regression. So
  the restore does not keep Zero's restored state at all, and lets every client
  reset.
- **pg-boss** ([jobs](https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md)):
  - `send(name, data, { startAfter })` takes seconds, an ISO string, an
    interval or a `Date`;
  - an active job expires after `expireInSeconds` (15 minutes by default) and
    is retried. So jobs active at the dump re-run after a restore, which every
    handler here already tolerates.
- **Postgres 18**
  ([pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html),
  [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)):
  - publications are dumped, and slots and roles are not;
  - `--create` connects to another database (`-d postgres`);
  - with the same superuser name, which the `.env` provides, ownership restores
    without `--no-owner`.
