# Decisions Needed for the Requests of 2026-10-14

Every question the research of 2026-10-14 left for the user, in one list,
deduplicated across documents. Answer by number ("E1: yes, E2: …"). Each
question links to the section of the research document that explains it; the
recommended answers are the research's recommendations, not decisions.

The question prefixes (E, L, RB, QM, BK, H) are chosen not to collide with the
requirement IDs of the request files (P, B, R, Q, U, D, O).

Research documents:
- [user-data-encryption.md](../../security-privacy/user-data-encryption.md) (E)
- [operator-liability-and-policies.md](../../security-privacy/operator-liability-and-policies.md) (L) — research, not legal advice
- [payment-processor.md](../../technologies/payment-processor.md) and
  [roles-and-administrators.md](../../system-architecture/roles-and-administrators.md) (RB)
- [quotas-and-usage-metering.md](../../system-architecture/quotas-and-usage-metering.md) (QM)
- [backup-and-disaster-recovery.md, proposed revision](../../devops-deployment/backup-and-disaster-recovery.md#revision-proposed-2026-10-14-awaiting-the-user) (BK)
- [production-hardening.md](../../security-privacy/production-hardening.md) (H)

## Fix regardless of decisions

Two live defects found during research, both confirmed first-hand. Neither
depends on any question below.

| # | Defect | Fix | Details |
|---|---|---|---|
| F1 | **All public users share one Better Auth rate-limit bucket.** The EC2 relay masquerades every client to `10.100.0.1`, so the per-IP limits (3 per 10 s on sign-in) apply to everyone at once. | Loosen or disable the sign-in path rules (`rateLimit.customRules`) until real client IPs exist. | [production-hardening.md](../../security-privacy/production-hardening.md#found-during-research-live-defects) |
| F2 | **Deleting an account leaves the user's PDFs in Garage.** Only the `articles.delete` mutator enqueues PDF cleanup; `src/auth/create-auth.ts` has no deletion hook. | A `beforeDelete` hook that enqueues deletion of the user's whole Garage prefix, with a test. | [production-hardening.md](../../security-privacy/production-hardening.md#found-during-research-live-defects) |

## Decide these first

These block the others: the encryption design shapes migration, backups and
the admin statistics; jurisdiction shapes the policies and the processor; the
open-source exception gates billing; the quota numbers and cap semantics shape
the metering, the pop-up and the profile.

| # | Question | Recommended answer | Blocks |
|---|---|---|---|
| E1 | Must the operator be *unable* to read stored user content? | Decide on user privacy, not operator protection; if yes, option (d) | E3–E7, D7 "by construction", what backups hold |
| E2 | Is permanent loss of a user's library acceptable when they lose every device and the recovery kit? | Accept only if "we cannot help" is acceptable; otherwise choose server-held keys (a) | Whether (d) is possible at all |
| L1 | Where is the operator legally based? | State it; the research assumes the US | L3–L5, RB2–RB4 |
| RB1 | Approve a paid payment processor as an exception to the open-source rule (DESIGN.md allows only auth)? | Yes, for Polar | All of billing |
| RB2 | Merchant of record (vendor files tax) or be the seller yourself? | Merchant of record (Polar) | RB3–RB12 |
| QM1 | Are the regular limits meant to be this tight? 25 MiB holds about nine 2.9 MB papers or one 13.4 MB textbook. 50 MiB a month is about eighteen downloads of such a paper, or three of the textbook. | Confirm or retune; the numbers live in one config | Pop-up, profile, dashboards |
| QM2 | Strict caps (reserve the whole file) or soft (let the last request overshoot)? | Strict | Metering design |

## Encryption

| # | Question | Recommended answer | Where |
|---|---|---|---|
| E1 | Must the operator be unable to read stored content (d or c), or is protection against thieves and backup leaks enough (a)? | See "Decide these first" | [Options](../../security-privacy/user-data-encryption.md#the-four-options) |
| E2 | Is permanent data loss on lost keys acceptable? | See "Decide these first" | [Second device](../../security-privacy/user-data-encryption.md#getting-the-key-onto-a-second-device) |
| E3 | Plaintext at upload time (d), or the server never sees plaintext (c), losing GROBID features? | Accept plaintext at upload (d) | [This app under (d)](../../security-privacy/user-data-encryption.md#what-changes-in-this-app-under-option-d) |
| E4 | Which fields may stay plaintext: reading status and position, fold state, annotation page index, upload filename, timestamps? | All except the upload filename (seal or drop it) | [This app under (d)](../../security-privacy/user-data-encryption.md#what-changes-in-this-app-under-option-d) |
| E5 | Dormant users: deadline length; delete, or export link then delete; email them at their Google address? | An announced, emailed deadline, then export link and delete; the length is your call | [Migration](../../security-privacy/user-data-encryption.md#migrating-existing-data-p7-p8) |
| E6 | Unlock methods: recovery code only, plus passkey PRF, plus passphrase? | Mandatory recovery code, optional passkey PRF, device linking; no passphrase | [Second device](../../security-privacy/user-data-encryption.md#getting-the-key-onto-a-second-device) |
| E7 | Accept "the server will not run new extraction over old papers" as a site-wide rule? | Yes, if (d) is chosen | [This app under (d)](../../security-privacy/user-data-encryption.md#what-changes-in-this-app-under-option-d) |

## Legal and policies

| # | Question | Recommended answer | Where |
|---|---|---|---|
| L1 | Where is the operator legally based? | See "Decide these first" | [Summary](../../security-privacy/operator-liability-and-policies.md#questions-for-the-user) |
| L2 | Will any feature ever let one user's content be seen by another user? | No; make it a site-wide rule, and treat any sharing feature as a legal-scope change | [DMCA](../../security-privacy/operator-liability-and-policies.md#copyright-the-dmca-512c-safe-harbor-p3) |
| L3 | Accept EU/UK users, and sell the paid tier to them? | Accept them; sell through a merchant of record | [Non-US users](../../security-privacy/operator-liability-and-policies.md#non-us-users) |
| L4 | Home address as the public DMCA agent address, or a P.O. box / agent? | P.O. box (free waiver) or a registered agent | [DMCA](../../security-privacy/operator-liability-and-policies.md#copyright-the-dmca-512c-safe-harbor-p3) |
| L5 | Form an LLC and/or pay for a legal review before the paid role? | At least a one-time review of Terms and Privacy before charging | [Recommendation](../../security-privacy/operator-liability-and-policies.md#recommendation) |
| L6 | Is telling Semantic Scholar what users upload acceptable, or make enrichment opt-in? | Keep it, and disclose it in the privacy policy | [Policies](../../security-privacy/operator-liability-and-policies.md#policies-a-small-operator-needs-regardless) |
| L7 | Adopt the legal hygiene list now (DMCA agent, Terms, Privacy, abuse contact, NCMEC registration, CSAM runbook)? | Yes | [What protects the operator](../../security-privacy/operator-liability-and-policies.md#what-protects-the-operator-p4) |
| L8 | Which monitored mailbox handles abuse, DMCA and security reports? | One monitored mailbox for all three | [Policies](../../security-privacy/operator-liability-and-policies.md#policies-a-small-operator-needs-regardless) |
| L9 | Require 13+ at sign-up, and 18+ (or parental consent) for paid? | Yes | [Policies](../../security-privacy/operator-liability-and-policies.md#policies-a-small-operator-needs-regardless) |

## Roles and billing

| # | Question | Recommended answer | Where |
|---|---|---|---|
| RB1 | Approve a payment processor as an open-source exception? | See "Decide these first" | [Payment processor](../../technologies/payment-processor.md) |
| RB2 | Merchant of record or be the seller? | See "Decide these first" | [Tax](../../technologies/payment-processor.md#tax-and-merchant-of-record) |
| RB3 | Country, individual or company, bank country and currency; is ID-plus-selfie verification acceptable? | Answer needed for onboarding | [Lifecycle](../../technologies/payment-processor.md#lifecycle) |
| RB4 | Which countries may buy? | All except sanctioned countries, through a merchant of record | [Tax](../../technologies/payment-processor.md#tax-and-merchant-of-record) |
| RB5 | Paid role ends at period end or at once on cancel; grace for failed cards? | Period end; 7-day grace | [Role from subscription](../../technologies/payment-processor.md#how-a-subscription-drives-the-paid-role-any-processor) |
| RB6 | Going down while over the lower storage cap (U6): read-only until under the cap, or delete? | Read-only, uploads blocked, nothing auto-deleted | [Roles](../../system-architecture/roles-and-administrators.md#questions-for-the-user) |
| RB7 | Refund policy? | No recommendation; note Polar may refund unilaterally within 60 days | [Lifecycle](../../technologies/payment-processor.md#lifecycle) |
| RB8 | Can an administrator also be paid, or is checkout hidden for admins? | Hidden; admin is fixed by `.env` | [Roles](../../system-architecture/roles-and-administrators.md#where-paid-lives-and-how-the-role-reaches-the-app) |
| RB9 | Is $5 tax-exclusive or inclusive? Annual plan or free trial? | No recommendation; tax-exclusive keeps ~$4.25 per month | [Fees](../../technologies/payment-processor.md#fees-on-a-500-charge) |
| RB10 | Upgrade wording: what the buyer gets first, cost support second? | Yes | [Role from subscription](../../technologies/payment-processor.md#how-a-subscription-drives-the-paid-role-any-processor) |
| RB11 | Payout cadence; accept a 7-day settlement delay? | Quarterly batching; accept the delay | [Fees](../../technologies/payment-processor.md#fees-on-a-500-charge) |
| RB12 | Stay on Better Auth 1.6 (plugin 1.8.4) or move to 1.7 (Polar 2.x)? | Stay on 1.6 unless upgrading Better Auth anyway | [Better Auth](../../technologies/payment-processor.md#better-auth-integration-this-project-is-on-16) |
| RB13 | How does an admin learn their own id? | Show every user their own id with a copy button in the profile | [Admin check](../../system-architecture/roles-and-administrators.md#better-auth-admin-plugin-or-an-own-check) |
| RB14 | Own `isAdmin()` check instead of Better Auth's admin plugin? | Yes; the plugin's impersonation contradicts D7 | [Admin check](../../system-architecture/roles-and-administrators.md#better-auth-admin-plugin-or-an-own-check) |
| RB15 | May admins see names and emails? Per-user paper counts? A platform-wide paper count? | Names and emails: your privacy call; no per-user paper counts; platform-wide count is fine | [Dashboards](../../system-architecture/roles-and-administrators.md#admin-dashboards-without-content-access-d1d4-d7) |
| RB16 | A second, read-only Postgres role for admin endpoints? | Yes; it makes D7 a property of the system | [Dashboards](../../system-architecture/roles-and-administrators.md#admin-dashboards-without-content-access-d1d4-d7) |

## Quotas and metering

| # | Question | Recommended answer | Where |
|---|---|---|---|
| QM1 | Are the regular limits meant to be this tight? | See "Decide these first" | [Summary](../../system-architecture/quotas-and-usage-metering.md) |
| QM2 | Strict or soft caps? | See "Decide these first" | [Bandwidth enforcement](../../system-architecture/quotas-and-usage-metering.md#enforcing-bandwidth-strict-or-soft-q2) |
| QM3 | UTC calendar month for everyone, or the paid billing period? | UTC calendar month | [Bandwidth enforcement](../../system-architecture/quotas-and-usage-metering.md#enforcing-bandwidth-strict-or-soft-q2) |
| QM4 | Count only PDF downloads and uploads, excluding (and disclosing) Zero sync and page loads? | Yes | [What counts](../../system-architecture/quotas-and-usage-metering.md#what-counts-as-bandwidth-q2-q8) |
| QM5 | Keep serving 304s at the bandwidth cap? | Yes; cached papers keep opening | [Reaching a limit](../../system-architecture/quotas-and-usage-metering.md#what-reaching-a-limit-does-q3q6) |
| QM6 | Quotas site-wide per account, or per app? | No recommendation; the schema carries `app` either way | [Scope](../../system-architecture/quotas-and-usage-metering.md#configuration-and-scope) |
| QM7 | A cap or row limits for Postgres-held data (notes, annotations, tags)? | Yes, per-user row limits (also an abuse control) | [Stored](../../system-architecture/quotas-and-usage-metering.md#what-counts-as-stored-q1-q7) |
| QM8 | Does a data export count against the monthly bandwidth? | Exempt, but rate limited to once an hour | [Export](../../security-privacy/production-hardening.md#deletion-completeness-and-data-export) |
| QM9 | Does reaching a limit block the request and show the pop-up, rather than only warn? | Block and show the pop-up | [Reaching a limit](../../system-architecture/quotas-and-usage-metering.md#what-reaching-a-limit-does-q3q6) |

## Backups

| # | Question | Recommended answer | Where |
|---|---|---|---|
| BK1 | Acceptable data loss (RPO), and is "tens of minutes to hours" acceptable as "immediately"? | 6 hours; yes | [Changes](../../devops-deployment/backup-and-disaster-recovery.md#what-the-decided-design-misses-against-b1b6) |
| BK2 | Approve the revision (staging directory, `pg_dump -Fc`, S3-level Garage copy, one snapshot per checkpoint, restore script, drills)? | Yes | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK3 | Offsite store: B2, R2 or a Hetzner Storage Box? | R2 if drills are frequent (free egress), otherwise B2; both cost cents | [Cost](../../devops-deployment/backup-and-disaster-recovery.md#cost) |
| BK4 | Do the system flake, WireGuard key, relay config and LUKS keys count; where is each kept; is different hardware in scope? | Yes; the runbook names where each lives | [Changes](../../devops-deployment/backup-and-disaster-recovery.md#what-the-decided-design-misses-against-b1b6) |
| BK5 | How much free disk does the home node have? | Answer needed (a PDF mirror plus a drill copy) | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK6 | Run drills on the production node at night, or elsewhere? | Production at night, at low CPU and I/O priority | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK7 | Where does the break-glass set live; who else may restore? | Password manager plus a printed copy | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK8 | Protect backups from a compromised node? | Yes, the cheap tier: a scoped key and "keep only last version" lifecycle | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK9 | Delay physical PDF deletion up to a day, or accept the race and rely on the reconcile report? | No firm recommendation; a delay is simplest and must be disclosed | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK10 | Backups keep deleted users' data ~12 months: acceptable, or shorten monthly retention? | Keep a tombstone list re-applied on restore, disclose the window, consider shorter monthly retention | [Deletion](../../security-privacy/production-hardening.md#deletion-completeness-and-data-export) |
| BK11 | Depend on Docker Hub/GHCR during relaunch, or archive the pinned images? | No recommendation | [Changes](../../devops-deployment/backup-and-disaster-recovery.md#what-the-decided-design-misses-against-b1b6) |
| BK12 | A small read-only watcher on the EC2 relay? | Yes (the uptime check, H3, can share it) | [Proposed changes](../../devops-deployment/backup-and-disaster-recovery.md#proposed-changes) |
| BK13 | Users stay signed in across a restore, or sign in again? | Stay signed in; the checkpoint holds the secret and session rows | [Questions](../../devops-deployment/backup-and-disaster-recovery.md#questions-for-the-user) |

## Hardening

| # | Question | Recommended answer | Where |
|---|---|---|---|
| H1 | Bind the app port to loopback only? | Yes | [Parser isolation](../../security-privacy/production-hardening.md#upload-safety-and-parser-isolation) |
| H2 | Real client IPs (PROXY protocol on the relay, or policy routing on the node), or user-id limits only? | Real IPs soon after launch; user-id limits meanwhile | [Abuse controls](../../security-privacy/production-hardening.md#abuse-controls-and-rate-limiting) |
| H3 | Uptime monitor on the relay (Gatus), or a scheduled GitHub Actions check? | Gatus on the relay | [Uptime](../../security-privacy/production-hardening.md#logging-errors-uptime-resource-exhaustion) |
| H4 | An invite or allowlist mode for the first weeks? | Build the toggle; turning it on is your call | [Abuse controls](../../security-privacy/production-hardening.md#abuse-controls-and-rate-limiting) |
| H5 | Does the node use `system.autoUpgrade`; is there remote LUKS unlock? | Answer needed; no unattended reboots until remote unlock exists | [Supply chain](../../security-privacy/production-hardening.md#supply-chain-and-host) |
| H6 | Is a CDN ever acceptable as an open-source exception? | Not now; only if attacked | [DoS](../../security-privacy/production-hardening.md#headers-sessions-admin-dos-incident-response) |
| H7 | Maximum page count per PDF for the pdfium step? | About 2000 pages | [Parser isolation](../../security-privacy/production-hardening.md#upload-safety-and-parser-isolation) |
| H8 | Approve the MUST list as the hardening scope? | Yes | [Recommendation](../../security-privacy/production-hardening.md#recommendation) |
