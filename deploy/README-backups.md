# Backups: the Operator's Runbook

What the operator does by hand for the backups
([features/backups-you-can-relaunch-from](../features/backups-you-can-relaunch-from/description.md)),
and how to read what they report. Everything else runs on timers.

**What runs, once enabled:**

| Unit | When | What |
|---|---|---|
| `nicbk-website-backup` | every 6 hours (00:00, 06:00, 12:00, 18:00, plus up to 5 min) | `deploy/backup.sh`: one checked checkpoint to B2 |
| `nicbk-website-prune` | Sundays 03:30 | `deploy/prune.sh`: retention, the size ceiling, `restic check` |
| `nicbk-website-alert@…` | when any of the above, or the deploy, fails | `deploy/alert.sh`: the unit's last log lines to ntfy |

All of them, and the deploy, take one lock, so they never overlap.

## Setting up (once)

### 1. The bucket and its lifecycle rule

These use the [B2 command-line tool](https://www.backblaze.com/docs/cloud-storage-command-line-tools),
on the operator's own machine, signed in with the account's master key. **That
key never goes on the node.** Anyone holding it can delete the history.

```sh
b2 account authorize                     # the master key, interactively
b2 bucket create nicbk-website-backup allPrivate
# Hidden files are erased 30 days after they are hidden (P32-1). restic never
# truly deletes through the node's key (step 2), it hides. So this is both
# what reclaims pruned space and the window in which a compromised node's
# "deletions" can still be undone.
b2 bucket update nicbk-website-backup allPrivate \
  --lifecycle-rule '{"daysFromHidingToDeleting": 30, "daysFromUploadingToHiding": null, "fileNamePrefix": ""}'
```

Note the bucket's region from its S3 endpoint in the B2 web console
(`s3.<region>.backblazeb2.com`).

### 2. Three keys

| Key | Capabilities | Lives |
|---|---|---|
| **node** | `listBuckets,listFiles,readFiles,writeFiles`: **no `deleteFiles`** | the node's backup environment file |
| **watcher** | `listBuckets,listFiles,readFiles` | the EC2 relay (task 4) |
| **break-glass** | `listBuckets,listFiles,readFiles` | the break-glass set (step 6) |

```sh
b2 key create --bucket nicbk-website-backup nicbk-node listBuckets,listFiles,readFiles,writeFiles
b2 key create --bucket nicbk-website-backup nicbk-watcher listBuckets,listFiles,readFiles
b2 key create --bucket nicbk-website-backup nicbk-break-glass listBuckets,listFiles,readFiles
```

Each prints a key id and a key. Over S3 they are the access key id and the
secret access key.

### 3. The backup environment file

On the node, as root, from [backup.env.example](./backup.env.example):

```sh
install -d -m 0700 /var/lib/nicbk-website-backup
install -m 0600 /var/lib/nicbk-website/deploy/backup.env.example /var/lib/nicbk-website-backup/backup.env
$EDITOR /var/lib/nicbk-website-backup/backup.env
```

- `RESTIC_REPOSITORY=s3:https://s3.<region>.backblazeb2.com/nicbk-website-backup`
- `RESTIC_PASSWORD`: a new long random password (`openssl rand -base64 48`).
  **It is irrecoverable if lost**, so it goes into the break-glass set before
  anything else.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: the **node** key.
- `AWS_DEFAULT_REGION`: the region from step 1.
- `NTFY_URL`: `https://ntfy.sh/<a long random topic name>`. Subscribe to it in
  the ntfy app before going on.

### 4. Create the repository, and check that deleting only hides

```sh
cd /var/lib/nicbk-website
sudo deploy/restic.sh . init
```

Then prove, once, that the node's key cannot truly delete (BK8). This is the
one step the research could not confirm from Backblaze's own documentation:

1. Take two checkpoints by hand: `sudo systemctl start nicbk-website-backup`,
   and once it has finished, again.
2. Forget the older and prune:
   `sudo deploy/restic.sh . forget --keep-last 1 --prune`.
   **It must succeed.** If it fails on a delete, stop: the node's key cannot
   prune, and the fallback is to prune from a machine holding a delete-capable
   key. Tell the developer.
3. In the B2 web console, browse the bucket with **Show file versions** on. The
   pack files the prune removed are listed as **hidden**, not gone.

### 5. Enable the timers

The backup options are in this repository's `flake.nix`, which the host reads
as a pinned flake input, not through the deploy timer. So first update that
input in the system flake (`nix flake update nicbk-website`, or whatever the
input is named there). Then, next to the existing `services.nicbk-website`:

```nix
services.nicbk-website.backup = {
  enable = true;
  environmentFile = "/var/lib/nicbk-website-backup/backup.env";
};
```

Rebuild, then run one checkpoint and read it:

```sh
sudo systemctl start nicbk-website-backup
journalctl -u nicbk-website-backup -n 30
sudo deploy/restic.sh /var/lib/nicbk-website snapshots
```

The last log line names the checkpoint, its object count and its commit.

To check alerting, stop the stack's database (`docker compose -f
docker-compose.yml stop db`), start a backup, and wait for the ntfy alert. Then
start the database again.

### 6. The break-glass set

Kept **off the node**, in the operator's password manager and on one printed
copy (BK7). It is everything needed to reach the backups if the node is gone:

- the restic password;
- the **break-glass** key id and key, read-only;
- the repository URL (`RESTIC_REPOSITORY`) and region;
- the git remotes of this repository and of the host's system flake;
- where the WireGuard key and the relay's configuration live.

The printed copy is dated. Reprint it whenever the restic password changes.

## Reading what it reports

- **An ntfy alert "… failed"** carries the unit's last log lines; the full log
  is `journalctl -u <unit>`. The usual causes:
  - **"articles whose PDF is not in the bucket copy"**: a row names a PDF the
    bucket does not have. The checkpoint was refused, so nothing bad was
    stored. Investigate the listed keys.
  - **restic exit 1, 3, 11 or 12**: the repository was unreachable or locked,
    a staged file was unreadable, or the password was wrong. A stale lock
    left by a crashed run is cleared with `deploy/restic.sh . unlock`.
  - **"over its ceiling, and every remaining checkpoint is protected"**: the
    repository is more than ten times the largest recent checkpoint with
    nothing old left to remove. Nothing was removed. Something is churning
    data, and it is worth finding out what.
- **"backup history thinned"** (not a failure): the size ceiling removed old
  checkpoints. In normal use it never binds, so it means unusual churn.

## Restoring by hand (until task 3)

Task 3 adds `deploy/restore.sh`, which does all of this and checks the result.
Until it lands, a checkpoint can be restored by hand onto a stack with the
right checkout:

1. `sudo deploy/restic.sh . restore latest --target /backup/restore`. Then the
   checkpoint is in `/var/lib/nicbk-website-backup/restore/backup/staging/`.
2. Read its `MANIFEST.json`, and check out its `gitSha`.
3. Copy its `config/.env` to the checkout's `.env`.
4. Remove the old volumes, start `db`, and restore the dump:
   `docker compose -f docker-compose.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --clean --if-exists --create -d postgres' < …/postgres/database.dump`.
5. Start `garage` and run `garage-init`. Then copy the objects back with the
   `rclone` service: `rclone copy /backup/restore/backup/staging/objects garage:<bucket>`.
6. Start the stack. zero-cache re-syncs from Postgres. If it refuses the
   restored database's Zero state, Zero's documented reset is `zero-out`.
   Task 3 automates and tests that step.
