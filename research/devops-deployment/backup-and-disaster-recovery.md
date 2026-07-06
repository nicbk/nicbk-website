# Backup and Disaster Recovery

Researched: 2026-07-05. Decided: 2026-07-05.

Backup strategy for Postgres and Garage, given the single-node topology
decided in
[hosting-and-infrastructure.md](./hosting-and-infrastructure.md) and
[../system-architecture/service-topology.md](../system-architecture/service-topology.md)
is a single point of failure — both services run as plain containers with
none of NixOS's native `services.postgresql`/`services.garage` backup hooks
available, so this has to be designed explicitly rather than inherited for
free (as flagged in `hosting-and-infrastructure.md`'s Reasoning section).
Guiding principles from [index.md](./index.md) apply here as everywhere in
this category: prefer open-source tooling, minimize manual configuration.

Boundary notes: code/image rollback (as opposed to data recovery) belongs to
[deployment-strategy.md](./deployment-strategy.md), which this doc doesn't
revisit. Migration sequencing belongs to
[database-migrations.md](./database-migrations.md).

## Decision

### One tool, one schedule: restic, backing up both Postgres and Garage

**restic** is the single backup tool for both services, run on a systemd
timer (the same pattern already established for deployment in
`deployment-strategy.md` — a script on a timer, no long-lived daemon or
GitOps-style tool to adopt). One restic repository holds both:

- **Postgres**: `pg_dumpall | restic backup --stdin --stdin-filename
  postgres.sql` — a full logical dump piped directly into restic, no
  intermediate file to manage or clean up.
- **Garage**: its `metadata_dir` and `data_dir` backed up directly as plain
  files (Garage is colocated on the same host, so this is a local
  filesystem path, not an S3-level sync) — following Garage's own cookbook
  guidance, which recommends exactly this for single-node deployments
  alongside its `metadata_auto_snapshot_interval` feature for
  crash-consistent metadata snapshots between backup runs.

restic was chosen over borgbackup specifically for the offsite-destination
fit below: it has native Backblaze B2/S3/rclone backend support built in,
while Borg has no native cloud-object support and would need rclone bolted
on, plus a Borg install on the destination side for its own native mode.
Both tools encrypt client-side (AES-256) by default, so this isn't an
encryption tradeoff either way — restic's backend support is simply a
better fit for the destination already chosen.

### Postgres granularity: scheduled logical dumps, not WAL-based PITR

Backups are periodic `pg_dumpall` snapshots, not continuous WAL archiving.
This means restore recovers to the most recent completed backup, not an
arbitrary point in time — the accepted tradeoff for a personal-scale
project with no dedicated ops role. Notably, Zero's already-required
`wal_level=logical` (see
[../technologies/database.md](../technologies/database.md)) gives no free
backup infrastructure here: WAL archiving is a separate, unconfigured
setting (`archive_mode`/`archive_command`) that Zero's requirement doesn't
touch, so point-in-time recovery would be genuinely new operational surface
to add, not a byproduct of a decision already made. WAL-G (physical,
PITR-capable) was the alternative considered and rejected on those grounds;
pgBackRest was also considered and rejected on a separate, more concrete
basis — it was briefly archived in April 2026 after its corporate sponsor
was sold, and only came back under a volunteer coalition in May 2026, which
is a real maintenance-continuity risk for a project with no team to absorb
that kind of churn.

### Offsite destination: a cheap S3-compatible service, not a second machine

Backups are pushed offsite to a Backblaze-B2-style S3-compatible service —
no second physical machine or NAS exists in this project's infrastructure
today, and inventing one wasn't an option worth assuming. This is treated as
a hosting cost, not "devops tooling" in the sense this category's
open-source-preference principle is about: that principle governs the
*software* doing the backup work (restic itself is open source regardless
of the destination), the same way the existing EC2 relay in
`hosting-and-infrastructure.md` is a minor recurring cost accepted outside
that principle's scope, not a violation of it.

### Retention and restore verification

- **Retention**: `restic forget --keep-daily 7 --keep-weekly 4
  --keep-monthly 12 --prune` — restic's built-in grandfather-father-son
  scheme, no custom retention scripting needed. `restic prune` takes an
  exclusive repository lock and can run long, so it's scheduled separately
  (e.g. weekly) from the actual backup job, not on every run.
- **Verification**: `restic check` runs after every backup (cheap,
  structural). A full test restore (`restic restore latest --target
  <isolated-dir>`, then sanity-check the Postgres dump and Garage files) is
  run periodically — not just written-and-assumed-good — since an untested
  backup is not a verified disaster-recovery capability. `--read-data-subset`
  is used for routine integrity spot-checks rather than `--read-data`, since
  a full remote data check downloads the entire repository from the
  offsite service every time.

## Reasoning

- restic over borgbackup was decided on backend fit once the offsite
  destination (a cloud object store, not a second host) was settled — not a
  general restic-vs-borg preference. If a second machine is ever added
  later, this choice is worth revisiting, since Borg's peer-to-peer/SSH
  model is a more natural fit for host-to-host backup than object storage.
- pg_dump-based logical backups over WAL-based physical/PITR backups
  follows this category's minimal-manual-config principle directly: WAL
  archiving is ongoing infrastructure (an `archive_command`, a place for
  archived WAL segments to land, monitoring that archiving doesn't fall
  behind) that has to keep working continuously, versus a scheduled job
  that either succeeds or is visibly absent. The cost is recovery
  granularity (most recent backup, not an arbitrary timestamp) — accepted
  as reasonable for this project's actual data-loss tolerance.
  pgBackRest's brief 2026 archival is a concrete illustration of the
  single-maintainer risk this principle is meant to guard against, even
  though it was later revived.
- The offsite-destination question was surfaced explicitly rather than
  assumed, since nothing in the project's prior research (hardware,
  topology, or otherwise) implied a second machine existed — consistent
  with this project's practice of confirming assumptions rather than
  inventing infrastructure (see the secrets-storage reversal in
  `secrets-and-environment-config.md` for the same discipline applied
  elsewhere in this category).
- Scheduling via a systemd timer (rather than restic's own scheduling, which
  doesn't exist as a built-in feature) reuses the exact mechanism already
  established in `deployment-strategy.md`, rather than introducing a second
  scheduling paradigm for a second timer-driven job.

## Sources

- [postgresql.org — continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html) —
  confirms logical dumps don't use WAL and can't do PITR, and that dumps are
  a reasonable approach for smaller databases.
- [bytebase.com — top open-source Postgres backup solutions](https://www.bytebase.com/blog/top-open-source-postgres-backup-solution/) —
  WAL-G vs. pgBackRest vs. dump-based comparison.
- [pgbackrest.org](https://pgbackrest.org/),
  [groundy.com — pgBackRest no longer maintained](https://groundy.com/articles/pgbackrest-is-no-longer-maintained-postgresql-backup-alternatives-after/) —
  pgBackRest's April 2026 archival and May 2026 volunteer revival.
- [garagehq.deuxfleurs.fr/documentation/cookbook](https://garagehq.deuxfleurs.fr/documentation/cookbook/),
  [garagehq.deuxfleurs.fr/cookbook/recovering.html](https://garagehq.deuxfleurs.fr/cookbook/recovering.html) —
  Garage's own recommended backup approach (`metadata_dir` snapshots +
  `data_dir`/object-level backup) for single-node deployments.
- [servercrate.net — restic vs Borg](https://servercrate.net/restic-vs-borg/),
  [dev.to/selfhostingsh — restic vs BorgBackup](https://dev.to/selfhostingsh/restic-vs-borgbackup-which-backup-tool-to-use-4cmn) —
  backend-support and encryption-default comparison.
- [servercrate.net — restic Docker backup](https://servercrate.net/restic-docker-backup/) —
  restic's native Backblaze B2/S3 support.
- [tdem.in — restic with systemd](https://tdem.in/post/restic-with-systemd/) —
  systemd-timer scheduling pattern for restic (no built-in scheduler).
- [blog.aenix.io — restic backup from stdin](https://blog.aenix.io/restic-effective-backup-from-stdin-4bc1e8f083c1),
  [rafftechnologies.com — backing up Postgres to object storage with restic](https://rafftechnologies.com/learn/tutorials/back-up-postgresql-raff-object-storage-restic) —
  the `pg_dumpall | restic backup --stdin` pattern.
- [restic.readthedocs.io — working with repositories](https://restic.readthedocs.io/en/latest/045_working_with_repos.html),
  [pistack.xyz — backup integrity verification](https://www.pistack.xyz/posts/2026-05-11-backup-integrity-verification-restic-borg-borgmatic/) —
  `restic check`/`--read-data-subset` verification practice, and
  `restic forget --prune` retention scheduling.
