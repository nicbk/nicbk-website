# Feature: Backups You Can Relaunch From

**#32** in [../index.md](../index.md). The third request of 2026-10-14,
recorded in
[../../research/requests/2026-10-14/backups.md](../../research/requests/2026-10-14/backups.md)
(requirements B1–B6):

> well-defined periodic backup job that exports all nicbk-website information
> sufficient to immediately re-launch the platform idempotently from the backup
> checkpoint in case something happens to the currently running node(s).

## What it is

Today nothing is backed up. Postgres (accounts, sessions, every paper's
metadata, annotations, contents, folds, the job queue) and Garage (every
uploaded PDF) live on Docker volumes on one home node. If that disk dies, the
site and every user's library are gone.

## What it delivers

- **A checkpoint every six hours.** One restic snapshot holds everything needed
  to run the site again:
  - a Postgres dump;
  - a copy of every stored PDF;
  - the `.env`;
  - a manifest that says what the checkpoint holds and which commit it belongs
    to.

  The checkpoint is encrypted on the node and sent off it, to Backblaze B2.
- **A checkpoint is checked before it counts.** Each run restores its own dump
  into a scratch database and confirms that every paper in it has its PDF in
  the copy. A run that fails this alerts the operator; it is not just logged.
- **One script relaunches the site from a checkpoint.** It works on a fresh
  node or over a broken one. It replaces state, so running it twice gives the
  same site. Users stay signed in. Their devices re-sync on their own.
- **Restores are rehearsed on a schedule, not assumed:**
  - weekly, a light drill;
  - monthly, a full restore into a throwaway copy of the stack;
  - quarterly, a manual relaunch on a fresh machine from a checklist.
- **Somebody notices when backups stop.** A failed run alerts through ntfy. A
  watcher on the EC2 relay, off the node, alerts if the newest checkpoint is
  more than twelve hours old.
- **A deleted paper's PDF lingers for a day before it is erased**, so no
  checkpoint can hold a paper whose PDF is already gone (BK9). This is the one
  change users could notice. The Privacy Policy (#36) discloses it.
- **The operator's steps are written down**, in a runbook: the bucket, its keys,
  the break-glass copy, enabling the module, and the relay watcher.

## What it does not do

- **No point-in-time recovery.** A relaunch loses at most the six hours since
  the last checkpoint (BK1).
- **Deleted data does not leave old backups at once.** Monthly checkpoints are
  kept for a year. Restoring one re-applies every account deletion made since
  (BK10). Zero-access encryption (#39+) later makes old copies unreadable by
  crypto-shredding.
- **No second live node.** Losing the node still means an outage until someone
  runs the relaunch.
- **No change to the TLS setup or the relay.** Certificates are re-issued, not
  restored. Rebuilding the host is step 0 of the runbook, not a script.

## Exit state

The operator can lose the node, run one documented procedure on a new machine,
and have the site back at the last checkpoint: every account, paper, PDF,
annotation and fold, with users still signed in. A drill has already proved
this before it is ever needed.
