# Backup and Disaster Recovery

Researched: 2026-07-05. Decided: 2026-07-05; revision proposed 2026-10-14, awaiting the user.

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

## Revision proposed 2026-10-14 (awaiting the user)

Not decided. Everything above remains the decision until the user accepts this
revision. Proposed after the user's request of 2026-10-14 for a "well-defined
periodic backup job … sufficient to immediately re-launch the platform
idempotently" ([backups.md](../requests/2026-10-14/backups.md), **B1–B6**).
Nothing above has been implemented yet, so the revision changes a plan, not a
running system. Every question below is collected in
[decisions.md](../requests/2026-10-14/decisions.md).

Source caveat: most documentation hosts were blocked in the research
environment. Zero and restic docs were read from their GitHub sources; Garage,
pricing, Caddy, Let's Encrypt and `pg_dump` facts come from search summaries.
**All prices are aggregator figures**; re-check them on the vendors' pages.

### What the decided design misses, against B1–B6

| Requirement | Gap in the decision above | Proposed change |
|---|---|---|
| **B1** periodic | None | Keep the systemd timer. Suggested every 6 h with `Persistent=true`; NixOS's `services.restic.backups` module could provide the units (its option names were not fully read; verify) |
| **B2** well-defined | Contents, order and retention of secrets unstated | One written inventory (below) and a `MANIFEST.json` in every snapshot: git sha, image digests, migration count, row and object counts, checksums, dump and copy times |
| **B3** all information | Only Postgres and Garage. No `.env` | Add the `.env` (inside the encrypted snapshot). Regenerate rather than back up: the Zero replica and replication slot (zero-cache re-syncs from Postgres, [replication](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/debug/replication.mdx), [self-host](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/self-host.mdx)), TLS certificates (re-issued; Let's Encrypt allows 5 per identical name set per week, [limits](https://letsencrypt.org/docs/rate-limits/)). GPG/WKD material is public and already in git |
| **B4** relaunch immediately | No restore procedure, no proof | A `deploy/restore.sh` and `deploy/verify-restore.sh`, plus an automated restore drill |
| **B5** idempotent, one checkpoint | Postgres via `--stdin` and Garage directories become **separate snapshots** nothing ties together. Raw Garage directories restore poorly onto a new node | One staging directory → **one** restic snapshot. Restore **replaces** state, so running it twice gives the same result |
| **B6** off the node | The restic password and offsite key needed to reach the backup are not placed anywhere | A **break-glass set** kept off-node (below) |

### Proposed changes

1. **Postgres: `pg_dump --format=custom` per database into a staging
   directory**, replacing `pg_dumpall | restic backup --stdin`. A plain pipe into
   `--stdin` cannot see the dump's exit status; with `--stdin-from-command` a
   non-zero exit of the command creates no snapshot (verified first-hand,
   [restic backup docs](https://raw.githubusercontent.com/restic/restic/master/doc/040_backup.rst)).
   The custom format also allows selective restore, needed for Zero's derived
   schemas (below), which `pg_dumpall`'s plain SQL cannot do; and it avoids
   "role already exists" noise on a fresh Postgres. Keeping `pg_dumpall` with
   `--stdin-from-command` is workable if fewer changes are preferred. The dump
   includes the `zero_data` publication by default ([pgsql-hackers](https://www.postgresql.org/message-id/CAB7nPqRrwQrnWx%3DJmiRp3ARPH%2Bo3AaUCaJnNbqN9J5SK5T3wQg%40mail.gmail.com)).
2. **Garage: copy the bucket through its S3 API (`rclone sync`) into a staging
   mirror**, replacing the raw `metadata_dir`/`data_dir` backup. Restoring raw
   directories onto a new host is thinly documented for a single node (a lost
   node gets a new id and `layout assign --replace`; keeping the old id is only
   implied, *uncertain*), couples the backup to Garage's version and engine, and
   needs a metadata snapshot taken first. An S3-level copy restores into a fresh
   Garage through the existing idempotent `scripts/garage-init.mjs`, makes
   Garage's own secrets disposable, and gives the object list for free. Cost:
   the rclone binary (MIT) and local disk equal to all PDFs. Deuxfleurs'
   own guide uses the same pattern ([guide](https://guide.deuxfleurs.fr/operations/rclone/), search summary).
3. **One checkpoint = one restic snapshot** of the staging directory, tagged
   with the git sha, holding the dump(s), the object mirror, `.env` and
   `MANIFEST.json`. Treat restic exit code 3 (some source unreadable) as failure
   ([exit codes](https://raw.githubusercontent.com/restic/restic/master/doc/075_scripting.rst)).
4. **Order: Postgres first, objects second, reconcile last.** Uploads write
   the object before the row; deletes remove the row before the object. So a
   row in the dump has its object in the later copy, except an article deleted
   in the gap. The reconcile step checks every `articles.pdf_object_key` exists
   in the copy and fails the run loudly if not. To close the gap fully, delay
   the cleanup job's object deletion past the backup window (a pg-boss
   `startAfter`), at the cost of a deleted PDF lingering — a privacy-policy item.
5. **Zero's derived schemas** (`zero_0/cvr`, `zero_0/cdc`) describe a replica
   that will no longer exist. Leave them out of the restore
   (`pg_restore -N …`) or test both ways; no Zero doc says either way
   (*uncertain*). Zero's event triggers come along in the dump.
6. **Restore runbook and script** with replace semantics: fetch the snapshot,
   install `.env`, `pg_restore --clean --if-exists --create`
   ([pg_restore](https://man.archlinux.org/man/pg_restore.1)), wipe the Zero
   replica, start Garage and `garage-init`, `rclone sync` the objects back,
   start the stack (migrations are a no-op), wait for zero-cache's resync, run
   the verify script. Step 0, documented not scripted: rebuild the NixOS node
   from the system flake and re-point WireGuard and the relay.
7. **Automated restore drill**: the same restore code in a throwaway Compose
   project (`-p nicbk-drill`, fresh volumes, no published ports, no `app`
   service), asserting snapshot age, `restic check`, row counts and object
   checksums against the manifest, zero-cache reaching healthy, the
   publication's tables, and `.env` keys matching `.env.example`. Weekly
   "light", monthly "full"; plus a quarterly manual drill on a fresh NixOS VM,
   because only that tests the host, WireGuard, Caddy and image pulls. No source
   was found that restores into throwaway containers, so this part is new.
8. **Break-glass set, kept off-node** (password manager plus a printed copy):
   the restic repository password (irrecoverable if lost,
   [restic](https://raw.githubusercontent.com/restic/restic/master/doc/030_preparing_a_new_repo.rst)),
   a *read-only* offsite key separate from the node's write key, the repository
   URL, and the git remotes of this repo and the system flake.
9. **Alerting:** `OnFailure=` to ntfy, and an **off-node freshness check**
   (e.g. a daily job on the EC2 relay with a read-only key that alerts if the
   newest snapshot is too old), because a silently stopped backup is not
   self-evident.
10. **Retention:** as decided, plus `--keep-within 2d` for 6-hourly runs, and a
    bucket lifecycle of "keep only the last version" as restic recommends for
    B2.
11. **A rule for the encryption work:** never overwrite an object in place;
    write ciphertext to a new key. An in-place rewrite between the dump and the
    copy would pair a "plaintext" row with a ciphertext object. Wrapped key
    material in Postgres must be in every checkpoint (see
    [user-data-encryption.md](../security-privacy/user-data-encryption.md#interactions-with-the-other-requests)).
12. **Housekeeping:** fix the drift between
    [secrets-and-environment-config.md](./secrets-and-environment-config.md)
    (which says Garage's `admin_token` is avoided) and the compose file and
    `.env.example` (which use `GARAGE_ADMIN_TOKEN`); and, once decided, split
    this document into a `backup-and-disaster-recovery/` folder (decision,
    restore runbook, restore drill, retention and cost) per AGENTS.md.

### Cost

For 5–50 GB: Backblaze B2 at about $6.95/TB-month is $0.03–0.35/month, with
egress free up to about 3× stored data (aggregators,
[costbench](https://costbench.com/software/cloud-infrastructure/backblaze-b2/),
[egresscost](https://egresscost.com/backblaze-b2)); Cloudflare R2 is
$0.015/GB-month with no egress charge and a 10 GB free tier, so $0–0.60/month
and free drills ([R2 pricing](https://developers.cloudflare.com/r2/pricing)).
A Hetzner Storage Box is a flat ~€3.20/month for 1 TB (aggregators;
[dev.to](https://dev.to/devasservice/build-your-own-low-cost-cloud-backup-with-hetzner-storage-boxes-486h)).
Weekly light plus monthly full drills stay inside B2's free egress.

### Recommendation

*A recommendation, not a decision.* Keep restic, the timer, an offsite
S3-compatible store, GFS retention, no WAL-based recovery and `restic check`.
Adopt changes 1–12. Run every 6 hours.

### Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **BK1.** How many hours of uploads and annotations may be lost (6 h
  suggested), and is "tens of minutes to a few hours" acceptable as
  "immediately"?
- **BK2.** Approve this revision (changes 1–12)?
- **BK3.** Offsite store: B2, R2 (free egress, a Cloudflare account) or a
  Hetzner Storage Box?
- **BK4.** Does "all information" include the NixOS system flake, the WireGuard
  key, the relay config and the LUKS keys — and where is each kept? Is
  relaunch on *different* hardware in scope?
- **BK5.** How much free disk does the home node have (a PDF mirror plus a drill
  copy are needed)?
- **BK6.** May drills run on the production node at night, or elsewhere?
- **BK7.** Where does the break-glass set live, and who else may restore?
- **BK8.** Protect backups from a compromised node (scoped keys, Object Lock,
  pruning from elsewhere)?
- **BK9.** Delay physical deletion of a deleted PDF by up to a day to close the
  backup race, or accept the race and rely on the reconcile report?
- **BK10.** Backups keep a deleted user's data up to ~12 months: acceptable, or
  shorten the monthly retention?
- **BK11.** Is depending on Docker Hub/GHCR during a relaunch acceptable, or
  should the pinned images be archived too?
- **BK12.** May a small read-only watcher run on the EC2 relay?
- **BK13.** Must users stay signed in across a restore, or is signing in again
  acceptable?

### Sources (revision)

- [Zero — replication](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/debug/replication.mdx), [self-host](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/self-host.mdx), [connecting to Postgres](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/connecting-to-postgres.mdx), [zero-cache config](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/zero-cache-config.mdx) — the replica and slot are regenerated; cvr/cdc schema names.
- restic: [backup](https://raw.githubusercontent.com/restic/restic/master/doc/040_backup.rst), [working with repos](https://raw.githubusercontent.com/restic/restic/master/doc/045_working_with_repos.rst), [preparing a repo](https://raw.githubusercontent.com/restic/restic/master/doc/030_preparing_a_new_repo.rst), [scripting](https://raw.githubusercontent.com/restic/restic/master/doc/075_scripting.rst) — `--stdin-from-command`; `check --read-data-subset`; password loss; B2 via S3; exit codes.
- Garage (search summaries): [durability and repairs](https://garagehq.deuxfleurs.fr/documentation/operations/durability-repairs/), [configuration](https://garagehq.deuxfleurs.fr/documentation/reference-manual/configuration/), [recovering](https://garagehq.deuxfleurs.fr/documentation/operations/recovering/), [known issues](https://garagehq.deuxfleurs.fr/documentation/reference-manual/known-issues/), [migration to 1.0](https://garagehq.deuxfleurs.fr/documentation/working-documents/migration-1/), [backup tools](https://garagehq.deuxfleurs.fr/documentation/connect/backup/), [Deuxfleurs rclone guide](https://guide.deuxfleurs.fr/operations/rclone/).
- Postgres: [publications in pg_dump](https://www.postgresql.org/message-id/CAB7nPqRrwQrnWx%3DJmiRp3ARPH%2Bo3AaUCaJnNbqN9J5SK5T3wQg%40mail.gmail.com), [event triggers dumped](https://www.postgresql.org/message-id/8795.1452631064%40sss.pgh.pa.us), [pg_restore](https://man.archlinux.org/man/pg_restore.1), [pg_dumpall](https://www.2ndquadrant.com/documents/pg_doc/app-pg-dumpall.html).
- [Better Auth security (1.6)](https://better-auth.com/docs/1.6/reference/security) — non-destructive secret rotation.
- [Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/); [Caddy community](https://caddy.community/t/where-does-caddy-keep-their-certificates/4728), [flaviocopes](https://flaviocopes.com/courses/caddy/protect-config-and-recovery-state/) — certificates and the ACME account are safe to re-create.
- Prices: [R2](https://developers.cloudflare.com/r2/pricing), [costbench](https://costbench.com/software/cloud-infrastructure/backblaze-b2/), [egresscost](https://egresscost.com/backblaze-b2), [dev.to — Hetzner](https://dev.to/devasservice/build-your-own-low-cost-cloud-backup-with-hetzner-storage-boxes-486h), [whtop](https://www.whtop.com/compare/hetzner,webtropia), [rsync.net](https://rsync.net/products/universal.html) (aggregators; conflicting; verify).
- Drill practice: [restic-timers](https://github.com/stenwt/restic-timers), [restic forum — rolling subset](https://forum.restic.net/t/restic-check-read-data-read-data-subset-1-12/2549), [zimaspace](https://shop.zimaspace.com/blogs/support-tips/restic-repository-maintenance-check-prune-compact-test-restore).
- NixOS: [services.restic.backups options](https://mynixos.com/nixpkgs/option/services.restic.backups.%3Cname%3E.pruneOpts).
- [pg-boss job expiration](https://deepwiki.com/timgit/pg-boss/11.3-job-expiration) — restored active jobs are expired and retried (third-party, *uncertain*; confirm in the drill).
- Repository: `docker-compose.yml`, `.env.example`, `docker/garage.toml`, `flake.nix`, `deploy/deploy.sh`, `scripts/garage-init.mjs`, `scripts/migrate.mjs`, `src/db/migrations/0001_*.sql`, `src/lit-tracker/pdf/cleanup-stage.ts`.
