# Request: Periodic Backups for Relaunch

Source: the third bullet of [as-written.md](./as-written.md).
Path: **research → plan → implement**, per the user.
Builds on the decided deployment research in
[../../devops-deployment/index.md](../../devops-deployment/index.md) (NixOS
host, Docker Compose services, LUKS at rest).

## The user's words

> well-defined periodic backup job that exports all nicbk-website information
> sufficient to immediately re-launch the platform idempotently from the backup
> checkpoint in case something happens to the currently running node(s).

## Requirements

| ID | Requirement | The user's words |
|---|---|---|
| B1 | A **periodic job** that runs on a schedule, not by hand. | "periodic backup job" |
| B2 | **Well-defined**: what it captures, how often, where it goes, and how long it is kept are written down. | "well-defined" |
| B3 | It exports **all nicbk-website information**, site-wide, not only the Literature Tracker. | "exports all nicbk-website information" |
| B4 | It is **sufficient to relaunch immediately**. A backup that needs reconstruction work before the site can run fails this. | "sufficient to immediately re-launch the platform" |
| B5 | The relaunch is **idempotent from the checkpoint**. Restoring the same backup gives the same platform state, and repeating a restore is safe. | "idempotently from the backup checkpoint" |
| B6 | The threat is **loss of the running node or nodes**, so backups must live off those nodes. | "in case something happens to the currently running node(s)" |

## Questions the research must answer

- **What "all information" is:**
  - Postgres, which holds app data, Better Auth, pg-boss and the Zero
    publication;
  - the Garage objects (PDFs);
  - configuration and secrets (`.env`, keys, the GPG material behind WKD);
  - TLS state;
  - what can be regenerated instead, such as the Zero replica and caches.

  It also needs a consistent point in time across Postgres and Garage, so a
  row never points to an object missing from the backup.
- **Where backups go**, and how they are encrypted and kept. They must leave
  the node (B6), and secrets in a backup must not leak more than the node does.
- **Encryption interaction**
  ([data-privacy-and-hardening.md](./data-privacy-and-hardening.md)). Backups
  of client-encrypted data are ciphertext. The backup must not reintroduce
  plaintext the scheme removed.
- **Tooling** (e.g. pgBackRest, restic, Borg, `pg_dump`, Garage-level
  replication). This must fit the open-source-only constraint in
  [../../../high-level-guidance/design/DESIGN.md](../../../high-level-guidance/design/DESIGN.md).
- **Proving B4 and B5:** a restore drill, ideally automated, that brings up a
  fresh node from a backup and checks it.
- **Frequency and retention**, and the cost of the off-site storage.
