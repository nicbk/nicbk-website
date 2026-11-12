# Testing: Backups You Can Relaunch From

Most of this feature is shell scripts and systemd units, which the unit-test
coverage ratchet does not see. So the scripts are proven by running them, in CI
and on the node, against a real stack.

## Static checks (CI)

- **`shellcheck`** on everything in `deploy/` (a new CI step).
- **`nix flake check`**, so the module evaluates, if CI has Nix. If it does
  not, a `nix eval` of the module's options in a pinned Nix container.
- **`docker compose config`** with the `backup` profile and the drill override,
  so neither file can be broken silently.

## Unit and integration (Vitest, the ratchet applies)

- **The deletion delay** (task 1):
  - the cleanup and purge sends carry `startAfter` of 24 hours;
  - the sweep still queues nothing for a user who exists;
  - an integration test reads the queued job's `start_after` from pg-boss.
- **Tombstones** (task 3):
  - deleting an account writes one, after the delete and never before;
  - a failed write is logged and does not fail the deletion;
  - entries older than 13 months are trimmed.

## The round trip (a new CI job: "Backup round trip")

On the GitHub runner, with Docker:

1. Bring up `db`, `migrate`, `garage` and `garage-init` (no GROBID, no app),
   and seed them directly. Seed two users with a session each, a handful of
   papers with real PDF objects, annotations, a tag and a fold. Seed one user
   and one article without their PDF object, for the negative case.
2. Run `deploy/backup.sh` against a **local** restic repository in a temporary
   directory (restic's local backend), not B2.
3. Assert:
   - one `checkpoint` snapshot;
   - manifest counts equal to `SELECT count(*)`;
   - `restic check` passes.
4. Assert the negative case: with the orphan article present, the run fails,
   names the key, and leaves no new snapshot.
5. Run `deploy/restore.sh latest --replace` into a **different** Compose project
   with fresh volumes (task 3), then `deploy/verify-restore.sh`.
6. Restore again and assert identical counts (idempotence).
7. Tombstones: restore the first of two checkpoints, with a user deleted between
   them, and assert the user is absent.

## Browser (manual, on the sandbox, for task 3's PR)

The "verify against intent" check. The thing being proved is that **a person
using the site cannot tell a relaunch happened**, apart from losing what came
after the checkpoint.

1. Run the full stack, sign in through the stubbed Google, and upload three
   real papers (one a textbook with contents).
2. Annotate, fold the contents, and set a reading place.
3. Take a checkpoint, then remove every volume.
4. Restore.
5. Reload the open tab and check, in light and dark themes and at a phone width
   and a desktop width:
   - still signed in;
   - the collection shows all three papers;
   - the PDF opens at the saved page, with its annotations and folds;
   - an upload goes through to "done".
6. Record screenshots in the task's status.

## On the node (after merge, by the operator with the runbook)

- the first real run;
- the deletion-as-hide check on B2;
- the first light drill;
- the watcher alerting after the timer is stopped.

The quarterly manual drill on a fresh NixOS VM is the only test of the host,
WireGuard, Caddy and image pulls. It is a checklist, not CI.
