# Task: Drills and a Watcher

Task 4 of 5 of [#32](../../description.md). Sub-issue
[#271](https://github.com/nicbk/nicbk-website/issues/271).

Restores are rehearsed on a schedule, and a machine off the node notices when
checkpoints stop.

## Changes

- **`deploy/drill.sh light|full`:**
  - **Light (weekly):**
    - `restic check --read-data-subset=<week of year mod 12 + 1>/12`, so the
      whole repository is read every twelve weeks;
    - restore the newest dump into a throwaway Postgres;
    - compare its counts with the manifest;
    - compare `restic ls` of the mirror with the manifest's object count.
  - **Full (monthly):** `restore.sh latest --project nicbk-drill`, then
    `verify-restore.sh`, then remove the drill project and its volumes, on
    success or failure.
- **`docker-compose.drill.yml`**: an override that removes every published port
  (`!reset`) and the `app` service, so a drill cannot collide with production
  or serve traffic.
- **`flake.nix`**: `nicbk-website-drill-light` and `nicbk-website-drill-full`
  timers (night, `Persistent=true`), at `Nice=19` and
  `IOSchedulingClass=idle`, behind the shared lock, alerting on failure.
- **`deploy/relay/backup-freshness.sh`**: for the EC2 relay.
  - It runs `restic snapshots --no-lock --json --tag checkpoint` with the
    read-only key.
  - It posts to ntfy if the newest snapshot is older than 12 hours, if there is
    none, or if restic fails.
  - Beside it, a systemd service and timer to copy onto the relay, or a cron
    line if the relay is not NixOS.
  - Gatus (H3, #33) can later absorb it.
- **The runbook:**
  - installing the watcher on the relay;
  - the **quarterly manual drill** checklist: relaunch on a fresh NixOS VM from
    the break-glass set alone, timing each step and noting what was missing.
