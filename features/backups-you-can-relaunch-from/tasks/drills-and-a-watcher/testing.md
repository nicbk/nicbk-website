# Testing: Drills and a Watcher

- **Static checks:** `shellcheck` and `docker compose config` with the drill
  override.
- **CI:** the round trip runs `drill.sh light` against its local repository.
- **The watcher:** unit-tested as a script against a local repository. It is
  silent when the newest snapshot is fresh, and alerts on a stale or empty
  repository and on a restic failure (ntfy replaced by a local listener).
- **On the node:**
  - the first light and full drills;
  - the watcher alerting after the backup timer is stopped for 12 hours.
