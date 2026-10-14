# Quotas and Usage Metering

Researched: 2026-10-14. Decided: not yet — awaiting the user.

How per-user storage and monthly bandwidth are measured and enforced, so that
the limit pop-up, the profile's usage display and the admin per-user statistics
all show the same numbers. Answers **Q1–Q8** of
[quotas.md](../requests/2026-10-14/quotas.md), **D6** of
[admin-dashboards.md](../requests/2026-10-14/admin-dashboards.md), and **U2**
and **U3** of
[profile-role-and-quota.md](../requests/2026-10-14/profile-role-and-quota.md).
Roles come from [roles-and-administrators.md](./roles-and-administrators.md);
the encryption interaction is in
[../security-privacy/user-data-encryption.md](../security-privacy/user-data-encryption.md).
Every question below is collected in
[decisions.md](../requests/2026-10-14/decisions.md).

| Role | Total stored uploads | Network bandwidth |
|---|---|---|
| Regular (no role) | 25 MiB | 50 MiB per month |
| Paid ($5/month) | 5 GiB | 1 GiB per month |
| Administrator | no limit | no limit |

**Summary.**

- **Storage:** a Postgres ledger of PDF bytes recorded at upload, summed and
  checked inside the upload transaction under a per-user lock. Not a Garage
  listing, not a counter that can drift.
- **Bandwidth:** count what the app server can attribute to a signed-in user —
  **PDF downloads and accepted uploads**. Zero sync goes straight to zero-cache
  and cannot be attributed per user with anything Zero ships; page loads are
  unauthenticated. Say so in the UI ("PDF transfer").
- **Enforce bandwidth by reserve-then-refund** on a monthly row; the month is
  the **UTC calendar month** for everyone.
- **At a limit:** refuse with a structured "limit reached" response that opens
  the pop-up; cached papers (304 responses) keep opening.
- **Sanity check**, against the three PDFs measured on `nicbk.com` in #21
  (`features/a-paper-downloads-once/description.md`): a 13.4 MB textbook, a
  2.9 MB paper and a 0.14 MB paper.
  - 25 MiB holds one such textbook, or about nine papers the size of the
    2.9 MB one.
  - 50 MiB a month is about three downloads of the textbook, or about
    eighteen of that paper.
  - Three PDFs are not a distribution; the real headroom depends on what each
    user uploads.

Source caveat: Zero, Caddy and Postgres docs were read from their GitHub
sources (the doc sites were blocked); the upload and PDF paths were read in
this repository.

## Options

### What counts as "stored" (Q1, Q7)

Today **no byte size is stored anywhere** (`articles` and `upload_jobs` have no
size column).

| Option | Accuracy | Verdict |
|---|---|---|
| List the user's Garage prefix per upload | Exact, includes orphans | Racy (a concurrent upload is not listed yet), one S3 list per upload. **Use as a periodic audit only** |
| Counter row incremented and decremented | Exact only if every path adjusts it | Drifts on crashes, cleanup retries, account deletion. Not recommended |
| **Ledger `stored_objects(user_id, app, object_key PK, bytes, created_at)`, summed at check time** | Exact for everything recorded; nothing to drift | **Recommended** |

The ledger row is inserted in the upload transaction and deleted when the
cleanup job actually removes the object, so counted bytes equal bytes in
Garage and freeing is idempotent under pg-boss retries. Count **PDF bytes as
stored** (the object length). Under client-side encryption, record the
ciphertext length; the ledger needs no plaintext. Derived data (GROBID output,
outline, citation edges, notes, annotation JSON) is not counted: the user wrote
"total stored uploads". Whether that text needs its own cap is question QM7.

### Enforcing storage without races

Two concurrent uploads must not both pass at 20 of 25 MiB.

1. **Recommended:** `pg_advisory_xact_lock` on the user id, then sum the ledger,
   compare with the role's cap, then insert the ledger row, job and queue entry
   — all in `storeUpload`'s transaction. The lock serializes only that user's
   uploads and releases at commit ([Postgres explicit locking](https://raw.githubusercontent.com/postgres/postgres/master/doc/src/sgml/explicit-locking.sgml)).
2. `SELECT … FOR UPDATE` on a per-user row: same effect, more coupling (it
   locks a row Better Auth writes).
3. A conditional counter update: atomic, but it is the drifting counter.
4. A `CHECK` constraint cannot compare a sum against a role-dependent cap.

Placement keeps the documented order in `store-upload.ts` (blob written before
the transaction): a **fast pre-check** in `respondToUpload` for the whole batch
(a new `UploadRejection` reason, matching the "whole submission validated
first" rule), and the **authoritative check** under the lock. If the
authoritative check fails, delete the blob just written and return the
structured refusal. Administrators skip the check but **still get a ledger
row**, so their usage shows in statistics.

### What counts as bandwidth (Q2, Q8)

| Traffic | Path | Attributable per user? | Recommendation |
|---|---|---|---|
| PDF downloads | App server proxy route, session known | **Yes, exactly** | **Count** (the dominant cost) |
| PDF 304 revalidations | Same route, no body | Yes | Count as 0 |
| PDF uploads | App server upload route | Yes | **Count** accepted bytes |
| Zero sync | Browser → Caddy → zero-cache directly | **No** | Do not count; disclose |
| Pages, JS, CSS | Unauthenticated, cached | No | Do not count |
| API calls | App server | Yes, but tiny | Do not count |

Why Zero cannot be counted: its metrics have no per-user or bytes-to-client
measure ([Zero OTel docs](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/otel.mdx));
zero-cache does not authenticate the socket itself but forwards the cookie to
the app's `/query` and `/mutate` ([Zero auth](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/auth.mdx));
`ZERO_WEBSOCKET_MAX_PAYLOAD_BYTES` limits a message, it does not meter
([config](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/zero-cache-config.mdx)).
Counting it would need a new proxy that resolves cookies to users — not worth
it. Sync volume is bounded indirectly by the storage cap, except annotation and
note text (QM7).

Caddy's access log has byte counts, but Caddy runs on the host outside the
stack, logs cannot refuse a request in time, a cookie can only be logged hashed,
and whether `size` is meaningful for WebSocket connections is *uncertain*
([Caddy logging](https://raw.githubusercontent.com/caddyserver/website/master/src/docs/markdown/logging.md),
[log directive](https://raw.githubusercontent.com/caddyserver/website/master/src/docs/markdown/caddyfile/directives/log.md)).
Use it, if at all, as an independent audit.

**Counting in the app:** wrap the PDF body in a pass-through stream that sums
chunk lengths and refunds the unsent remainder if the browser aborts. Count
body bytes only; the cap is fair use, not an invoice. Uploads are charged in
the same transaction as the ledger row.

### Enforcing bandwidth: strict or soft (Q2)

```
bandwidth_usage(user_id, app, period /* first of the month, UTC */, bytes,
                primary key (user_id, app, period))
```

- **Reserve** the whole response with a conditional update
  (`… SET bytes = bytes + $len WHERE … AND bytes + $len <= $cap RETURNING`);
  the row lock serializes parallel requests; no row returned means over the
  cap. **Refund** the unsent part on abort.
- **Strict** (reserve the whole file, recommended): a user with 10 MiB of
  headroom cannot fetch a 13 MB paper. That is the literal reading of "limited
  to 50 MiB". **Soft** (allow while under the cap, let the last download
  overshoot) is simpler but lets parallel requests overshoot by several files.
- Administrators increment (for D6) without the cap predicate.
- One write per non-304 PDF response: negligible. Keep this table and the
  ledger out of the Zero publication unless live usage display is wanted.

**Month (Q2, D6):** the UTC calendar month for every role. A billing-anchored
month would make regular users (no billing period) a special case and make
mid-period role changes ambiguous. Reset is implicit: a new `period` row, no
cron. The admin bullet's "current billing month" is read as "this month" (to
confirm).

### What reaching a limit does (Q3–Q6)

The user named the pop-up but not the block. Recommended:

- **Storage:** refuse the whole upload with a 4xx and a body like
  `{ error: 'limit-reached', limit: 'storage', used, cap, role }`, which the
  client turns into the Q3–Q6 pop-up. Existing papers stay readable; deleting
  frees space after cleanup.
- **Bandwidth:** refuse uncached PDF downloads and uploads with the same body.
  **Still answer 304**: it costs nothing, so papers cached in the browser keep
  opening. The check sits after `openArticlePdf` and before the 200, cancelling
  the Garage stream on refusal. Because the cache header is `private,
  no-cache`, a browser that evicted the copy pays again. Reading metadata,
  tags and annotations over Zero is unaffected.
- The pop-up can also appear after the request that exactly reaches the cap.

### Configuration and scope

One module holds every limit, keyed by role, in binary units as the user wrote
them (`25 * 1024 ** 2`, `5 * 1024 ** 3`; admin `Infinity`), with Postgres
`bigint` sums. Both tables carry an `app` column from the start, so "site-wide
or per app" (QM6) becomes a query choice, not a migration. The profile (U2, U3)
reads the same numbers through the `/api/account/plan` endpoint in
[roles-and-administrators.md](./roles-and-administrators.md#where-paid-lives-and-how-the-role-reaches-the-app).

## Recommendation

*A recommendation, not a decision.*

1. Storage = PDF bytes in a `stored_objects` ledger with an `app` column; a
   batch pre-check plus the authoritative check under `pg_advisory_xact_lock`;
   rows removed when the cleanup job deletes the object.
2. Bandwidth = PDF download bytes plus accepted upload bytes, UTC calendar
   month, strict reserve-then-refund; 304s allowed over the cap; Zero sync,
   pages and API calls not counted, and the UI says so.
3. Refusals return one structured `limit-reached` body that drives the pop-up.
4. A periodic reconciliation (ledger against the Garage prefix listing) as an
   audit, which also catches blobs orphaned by account deletion (a live defect,
   see [production-hardening.md](../security-privacy/production-hardening.md#found-during-research-live-defects)).

## Reasoning

- Sizes recorded at write time are the only measure that is race-free,
  cheap, and still correct once content is encrypted.
- Counting only what the app server sees keeps one enforcement point that can
  refuse in time; everything else is either unattributable or negligible.
- A calendar month is the one definition that works for users with and
  without a billing period.

## Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **QM1.** Are the regular limits meant to be this tight (about two papers
  stored and three downloads a month)?
- **QM2.** Strict caps (reserve the whole file) or soft (let the last request
  overshoot)?
- **QM3.** UTC calendar month for everyone, or the paid user's billing period?
- **QM4.** Count only PDF downloads and uploads, with Zero sync and page loads
  excluded and disclosed?
- **QM5.** At the bandwidth cap, keep serving 304s so cached papers still open?
- **QM6.** Quotas per account site-wide, or per app when more apps exist?
- **QM7.** Should Postgres-held data (notes, annotations, tags) get its own cap
  or per-user row limits?
- **QM8.** Should a data export count against the monthly bandwidth?
- **QM9.** Should reaching a limit block the request (and show the pop-up),
  rather than only warn?

## Sources

- [Postgres — explicit locking](https://raw.githubusercontent.com/postgres/postgres/master/doc/src/sgml/explicit-locking.sgml), [MVCC](https://raw.githubusercontent.com/postgres/postgres/master/doc/src/sgml/mvcc.sgml) — advisory locks; `SELECT … FOR UPDATE`.
- [Zero — OTel metrics](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/otel.mdx) — no per-user or sync-bytes metric.
- [Zero — auth](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/auth.mdx) — cookies forwarded to `/query` and `/mutate`.
- [Zero — zero-cache config](https://raw.githubusercontent.com/rocicorp/zero-docs/main/contents/docs/zero-cache-config.mdx) — `ZERO_WEBSOCKET_MAX_PAYLOAD_BYTES`.
- [Caddy — logging](https://raw.githubusercontent.com/caddyserver/website/master/src/docs/markdown/logging.md), [log directive](https://raw.githubusercontent.com/caddyserver/website/master/src/docs/markdown/caddyfile/directives/log.md) — access-log fields; hashed cookies keep 4 bytes.
- Repository: `src/lit-tracker/upload/{upload-endpoint,store-upload,validation}.ts`, `src/lit-tracker/pdf/{pdf-endpoint,cleanup-stage}.ts`, `src/storage/pdf-storage.ts`, `src/db/schema/lit-tracker.ts`, `src/routes/api/lit-tracker/upload.ts`.
