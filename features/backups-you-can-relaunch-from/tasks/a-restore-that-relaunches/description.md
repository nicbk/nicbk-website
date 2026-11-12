# Task: A Restore That Relaunches

Task 3 of 5 of [#32](../../description.md).

One script takes a checkpoint and gives back the site. It replaces state, so it
is safe to repeat.

## Changes

- **`deploy/restore.sh <snapshot|latest> [--replace] [--project <name>]`**, in
  the order in the feature's
  [constraints](../../constraints-and-behavior.md#restore-b4-b5). `--project`
  is what the drills and CI use to restore beside production rather than over
  it.
- **`deploy/verify-restore.sh [--project <name>]`**: the checks listed there.
  It exits non-zero naming the first that failed.
- **Zero:**
  - run `zero-out`, from the pinned `rocicorp/zero` image or the app's
    `@rocicorp/zero` package, whichever ships the binary;
  - wipe the replica volume;
  - assert that `zero_data` survives. If `zero-out` drops it, re-create it with
    the SQL its migration used, through a shared file rather than a copy.
- **Tombstones (BK10):**
  - a `deleted_account (user_id text primary key, deleted_at timestamptz)`
    table in the identity schema, with a migration. It holds an id that is
    never reissued and nothing personal;
  - written by `onUserDeleted` in `src/auth/auth.ts`, after Better Auth's
    delete, never before. A write before the delete could, if the delete then
    failed, mark a living user for deletion on restore;
  - `backup.sh` exports the table to `tombstones.txt`;
  - `restore.sh` reads `tombstones.txt` from the **newest** snapshot it can
    read, and deletes those users after `pg_restore` (cascading). The worker's
    start-up sweep then purges their folders;
  - entries older than 13 months, longer than any checkpoint is kept, are
    trimmed by the backup run. When #39+ removes the one-year limit, the trim
    follows the oldest kept checkpoint instead.
- **The relaunch runbook**, a section of `deploy/README-backups.md`:
  - step 0, by hand: rebuild the NixOS host from the system flake, restore the
    WireGuard key, re-point the relay, clone this repository, and place the
    backup environment file from the break-glass set;
  - then `restore.sh latest --replace`;
  - then what to check in a browser.
- **CI:** the round trip's steps 5, 6 and 8.
