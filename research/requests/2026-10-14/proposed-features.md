# Proposed Features for the Requests of 2026-10-14

**Agreed by the user on 2026-11-12**: the breakdown and its order, with the
three discussion points accepted as written below
([answers](./answers-2026-11-12.md#agreement-to-the-proposed-features-as-written)).
Each feature is still spec'd in `features/`, and discussed, before it is built.

**Next step:** #32 is spec'd in
[`features/backups-you-can-relaunch-from/`](../../../features/backups-you-can-relaunch-from/description.md);
it awaits the user's go-ahead.

*Originally written for discussion.* It breaks the decided
research ([decisions.md](./decisions.md), with the user's answers in
[answers-2026-11-12.md](./answers-2026-11-12.md)) into roadmap features, each
a vertical slice with one PR per task. Each one is spec'd in `features/` only
after the user agrees to this breakdown and its order.

The user's cross-cutting rule (2026-11-12): **accounts, roles, payments and
dashboards are site-wide modules** the Literature Tracker *uses*, so later
apps reuse them. Per-app pieces (quotas, a dashboard page) plug into them.

## Proposed order

| # | Feature | Why here | Main contents |
|---|---|---|---|
| 32 | **Backups you can relaunch from** | No backup exists today; every later feature adds data worth keeping | The decided restic design plus the 2026-10-14 revision: staging dir, `pg_dump -Fc`, S3-level Garage copy, one snapshot per checkpoint with a manifest, every 6 hours, `deploy/restore.sh`, light and full restore drills, delayed physical deletion (BK9), an off-node freshness check (BK12). Built as a timer in this repo's NixOS module, as the deploy timer is. Some steps are the operator's (the off-site bucket, the break-glass copy) and are written down for them |
| 33 | **Hardening before growth** | Cheap; lowers risk for everything after | The approved MUST list (H8): early upload limits and a body cap, compose resource limits, GROBID on an internal network, a bounded pdfium worker with a page cap (H7), loopback-only app port (H1), CI scanners and dependency updates, the CSP/headers middleware, `/healthz`, `security.txt`. Steps outside the repo are listed for the operator: real client IPs at the relay (H2), and Gatus on the relay (H3) |
| 34 | **Roles** (site-wide) | Quotas, billing and dashboards all read the role | `resolveRole()` (admin from `ADMIN_USER_IDS` in `.env` by Better Auth user id, then paid, then regular), validated at start; `requireAdmin()` for server routes; the profile shows the role and the user's own id with a copy button (RB13) |
| 35 | **Quotas and usage** (site-wide module, per-app limits) | Protects the free tier now (QM1) | Stored-bytes ledger, monthly UTC bandwidth table, strict reservations (QM2), the limit-reached response and pop-up (Q3–Q6), usage shown in the profile per app (U2, U3), per-user row limits (QM7), 304s exempt (QM5), export exempt but rate limited (QM8) |
| 36 | **Terms, privacy and consent** | Needed before charging money | Terms and Privacy Policy (the processors named), an abuse/DMCA email contact (no agent registration yet, R2-6), the two runbooks in docs, 13+ at sign-up and 18+ for paid (L9), recording which Terms version each user accepted, the key-storage disclaimer (round 6); disclosing #32's 24-hour delay before a deleted PDF is erased (BK9) and the backups' one-year window (BK10) |
| 37 | **Paid plan** (site-wide billing module) | Depends on roles, quotas and terms | A provider-neutral billing interface with **Polar** as its first adapter (crypto later, RB2); checkout, customer portal, verified webhooks → a `subscriptions` table → role; paid through the period end, 7-day grace (RB5); the role change in the profile with a clear quota comparison (U5) and the destructive-downgrade confirmation (U6, U7) leading to read-only (RB6); no refunds (RB7); no checkout for admins (RB8) |
| 38 | **Admin dashboards** | Depends on roles, quotas and billing | The site dashboard tab for admins (D1–D4): accounts with names, emails, role and paper counts, plus platform totals (RB15). The Literature Tracker's in-app page: per-user stored bytes, this month's bandwidth, paper count (D5, D6). Served over REST through `requireAdmin()` and a read-only Postgres role (RB16); no content is reachable (D7) |
| 39–4x | **Zero-access encryption**, several features | The largest change; built on the modules above | Key management: Drive `appDataFolder` plus an optional recovery code, and the sign-up disclaimer. The browser crypto layer around Zero: decrypt into views, encrypt before every mutator. Sealed columns for everything in E4 (R2-3). The single in-memory upload job. Citation linking in the browser (R2-4). Consent jobs for re-processing (E7). The migration of existing data, then removal of the old paths (P7, P8). Search text out of the URL. Crypto-shredding on deletion (BK10), and then **removing #32's one-year backup limit**, leaving its size ceiling as the only limit (P32-2, decided 2026-11-12). The exact split is planned when the time comes |
| 4x | **Dormant free accounts** | Needs email, which the app cannot send today | The 5-year policy with yearly, then monthly, then daily notices (E5); paid accounts never expire |

## Questions for this discussion (agreed 2026-11-12)

The user agreed to all three as proposed: this order; research email sending
when the dormant-accounts feature comes up; the listed steps are the
operator's, each with instructions written by the feature that needs it.


1. **The order.** Backups and hardening first, because there is no backup
   today. Encryption is last of the large pieces, because it touches
   everything and is easier to build once the account modules exist. Agree,
   or move encryption earlier?
2. **Email.** Dormant-account notices (and probably billing notices) need
   outgoing email. Self-hosted mail is hard to get delivered, so this likely
   means a sending service: another third-party exception like Polar.
   Research it when that feature comes up?
3. **Steps outside the repository.** These are the operator's to do, with
   instructions written by the feature that needs them:
   - the relay change for real client IPs;
   - Gatus on the relay;
   - the off-site bucket;
   - the break-glass copy;
   - the Polar account and its identity check;
   - the Google Cloud console change for the `drive.appdata` scope.
