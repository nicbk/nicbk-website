# Feature: What the Research Found

**#31** in [../index.md](../index.md). Two live defects found while researching
the requests of 2026-10-14. They are listed as F1 and F2 under "Fix regardless
of decisions" in
[../../research/requests/2026-10-14/decisions.md](../../research/requests/2026-10-14/decisions.md),
and the user decided to fix both (2026-10-17).

## What it delivers

- **F1: one visitor can no longer lock everyone out of signing in.** The EC2
  relay masquerades every public client as `10.100.0.1`. Better Auth's per-IP
  rate limits therefore act as one limit for the whole site, 3 sign-in attempts
  per 10 seconds. The app stops pretending to tell clients apart, until the
  relay passes their real addresses (H2 in the decisions).
- **F2: deleting an account removes its PDFs.** Today the database rows go with
  the account but the user's PDFs stay in Garage. A deletion now queues a
  purge of the user's prefix. A sweep at worker start catches a purge that was
  never queued, including accounts deleted before this fix.

## What it does not do

- **No real client IPs.** That needs the relay or the host's Caddy, which live
  outside this repository, and the user's answer to H2.
- **Backups are untouched.** Deleted users' data stays in old backups until
  retention expires. That is BK10 in the decisions, and it is still open.

## Exit state

- Many people can sign in at the same moment.
- An account deleted today, or before today, leaves no PDF in the bucket.
