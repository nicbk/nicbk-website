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
- Round 2 (2026-11-12):
  [user-data-encryption-round-2.md](../../security-privacy/user-data-encryption-round-2.md) (E4, E7),
  [user-data-encryption-2fa-and-recovery.md](../../security-privacy/user-data-encryption-2fa-and-recovery.md) (E6) and
  [operator-liability-and-policies-round-2.md](../../security-privacy/operator-liability-and-policies-round-2.md) (E3, L4, L5) — questions in
  [Round 2 questions for the user](#round-2-questions-for-the-user-2026-11-12)

## Status after the user's answers of 2026-11-12

The answers are recorded verbatim in
[answers-2026-11-12.md](./answers-2026-11-12.md), which wins over any summary
here.

**Decided as recommended:** E2, L2, L6, L7, L8, L9, RB4, RB10, RB11, RB13,
RB14, RB16, QM2, QM3, QM4, QM5, QM7, QM8, QM9, BK1, BK2, BK4, BK6, BK7, BK8,
BK10, BK12, BK13, H1, H2, H3, H7, H8.

**Decided, with the user's own terms:**

| # | Decision |
|---|---|
| E1 | Zero-access encryption (option d): the server processes an upload in memory, so GROBID and Semantic Scholar still work, then stores it encrypted to the user's key. |
| E3 | Plaintext at upload time, mindful of DMCA and CSAM (see the follow-up research). |
| E5 | **Paid accounts never expire.** Free accounts: deleted after **5 years** without a sign-in, unless the user signs in or upgrades. Notices are emailed once a year after the last sign-in, then monthly in the final year, then daily in the final month. |
| E7 | **New feature:** when the server wants to re-process old papers, the user is notified, through the existing upload-status notifications, and approves or denies a temporary decryption for that job. What it needs: [E7 in round 2](../../security-privacy/user-data-encryption-round-2.md#e7-re-processing-with-consent). |
| L1 | United States. There must be a written procedure for DMCA notices and for CSAM. |
| L3 | EU/UK users accepted, and sold to through Polar. |
| L4 | No home address published: a P.O. box or a commercial DMCA agent. *Round 2 correction:* a P.O. box covers only the agent's address; the service provider's own address must be a street address ([address](../../security-privacy/operator-liability-and-policies-round-2.md#the-public-address-l4-a-correction); question R2-6). |
| RB1, RB2 | A closed-source processor is accepted. **Polar**, fiat first. **Crypto payments are a likely future addition**, so billing must not be Polar-shaped all the way down. |
| RB5 | A paid period is honoured to its end once paid in full; a 7-day grace for failed renewals. |
| RB6 | Over-quota after a downgrade means **read-only**: no uploads, and no annotating or editing existing papers. Nothing is auto-deleted except dormant accounts (E5). |
| RB7 | No refunds for now. |
| RB15 | Admins see names, emails, **per-user paper counts** and the platform-wide paper count, and nothing more. |
| QM1 | The free limits stay as tight as written (25 MiB stored, 50 MiB a month), to deter abuse. |
| QM6 | Quotas are per app. |
| BK5 | The node has at least a couple of terabytes free. |
| BK9 | Delay physical PDF deletion (and disclose it). |
| H4 | No invite or allowlist mode: the app stays public. |
| H6 | A CDN is acceptable. |
| RB3 | The operator accepts Polar's one-time seller identity check (ID and selfie through Stripe Identity). Users are never asked for ID. |
| RB8 | No checkout for administrators: they already have full access. |
| H5 | `system.autoUpgrade` is enabled **with `allowReboot = true`**. **The node's disk is not fully LUKS-encrypted**, contrary to what [pdf-and-annotation-data-protection.md](../../security-privacy/pdf-and-annotation-data-protection.md) assumed. Zero-access encryption covers stored content either way; account rows, secrets, backups' staging and logs on the node do not have that protection. To be weighed in planning. |

**A new cross-cutting requirement (the user, 2026-11-12):** payments,
dashboards, accounts and roles must be **modular**, so that they carry over to
the other services the site will add. They are site-wide modules that the
Literature Tracker uses, not features built into it.

**Delegated to the implementer ("whatever makes the most sense"):** RB9 (tax
display), RB12 (Better Auth line), BK3 (offsite store), BK11 (image
archiving). Each is decided in planning, with the reason written down.

**Still open (follow-up research, 2026-11-12):** all four researched in round
2 on 2026-11-12. What remains for the user is in
[Round 2 questions for the user](#round-2-questions-for-the-user-2026-11-12).

| # | What was open | Status |
|---|---|---|
| E4 | How much can be encrypted while Zero's reactive sync still works? | **Researched (round 2):** all content can be sealed; ids, foreign keys, timestamps and statuses stay plaintext. [What stays plaintext under Zero](../../security-privacy/user-data-encryption-round-2.md#round-2-2026-11-12-what-stays-plaintext-under-zero-e4). Questions R2-3, R2-4 |
| E6 | 2FA and a recovery code. Is the code still needed with 2FA? What is seamless with Google sign-in? | **Researched (round 2):** yes, the recovery code stays mandatory; passkey-first optional 2FA; Google 2SV cannot be enforced. [2FA, passkeys and the recovery code](../../security-privacy/user-data-encryption-2fa-and-recovery.md#round-2-2026-11-12-2fa-passkeys-and-the-recovery-code-e6). Questions R2-1, R2-2 |
| E3 | Screening uploads for CSAM and DMCA while they are plaintext. | **Researched (round 2):** do not scan at launch; register with NCMEC; apply to Pathways; leave a hook. [Screening uploads](../../security-privacy/operator-liability-and-policies-round-2.md#screening-uploads-for-csam-and-dmca-e3), with the [DMCA](../../security-privacy/operator-liability-and-policies-round-2.md#runbook-a-dmca-notice) and [CSAM](../../security-privacy/operator-liability-and-policies-round-2.md#runbook-csam-discovered-or-reported) runbooks. Question R2-5 |
| L5 | What an LLC costs and involves, and whether it makes sense at this scale. | **Researched (round 2):** a few hours; $0 to $800 a year depending on the state; not now. [Should the operator form an LLC?](../../security-privacy/operator-liability-and-policies-round-2.md#should-the-operator-form-an-llc-l5). Question R2-7 |

## Round 2 questions for the user (2026-11-12)

Only what the user must decide; the implementer's calls from round 2 (for
example the blind index for citation linking, moving search text out of the
URL, collapsing the upload pipeline into one job) are decided in planning.
Answer by number ("R2-1: yes, …"). The recommended answers are the research's
recommendations, not decisions. The legal items are research, not legal advice.

| # | Question | Recommended answer | Where |
|---|---|---|---|
| R2-1 | Optional 2FA as one switch, "Require a passkey to sign in", where a single passkey gesture both signs in and unlocks the library, with authenticator-app codes (TOTP) deferred to a later phase? Better Auth's 2FA plugin does not challenge Google sign-ins, and TOTP can never unlock the data on a new device. | Yes | [Passkey-first 2FA](../../security-privacy/user-data-encryption-2fa-and-recovery.md#recommended-passkey-first-optional-2fa) |
| R2-2 | One recovery code or two? **One:** a single code that unlocks the data and also gets past 2FA, through a small custom endpoint that replaces Better Auth's backup codes (a deviation from the adopted plugin). **Two:** keep Better Auth's backup codes beside the data recovery code, both printed on one recovery kit with clear labels. | One code | [One code or two](../../security-privacy/user-data-encryption-2fa-and-recovery.md#open-choice-one-recovery-code-or-two) |
| R2-3 | Keep the contents fold state (`expanded`) and the annotation page index in plaintext? Plaintext reveals which contents entries are open and which pages carry marks; sealing the fold state loses the merge when two devices fold different chapters (the later write wins). | Yes, keep both plaintext | [The split](../../security-privacy/user-data-encryption-round-2.md#the-plaintextencrypted-split) |
| R2-4 | Accept that a new paper's citation links to and from the rest of the collection appear only once a device is next unlocked and online? The server can no longer read the other papers, so the browser does the linking. | Yes | [Citation linking](../../security-privacy/user-data-encryption-round-2.md#citation-linking-moves-to-a-client-finishing-step) |
| R2-5 | No upload scanning at launch, with NCMEC ESP registration now, a Tech Coalition Pathways application now, and a hook in the upload stage turned on by the listed triggers (sharing, non-PDF images or video, a CSAM report, a STOP CSAM-style law, real public growth)? Or PhotoDNA from day one, accepting a quarantine store outside zero-access? | No scanning at launch; register with NCMEC and apply to Pathways now | [Screening uploads](../../security-privacy/operator-liability-and-policies-round-2.md#screening-uploads-for-csam-and-dmca-e3) |
| R2-6 | One virtual mailbox (CMRA) street address, about $10–$20 a month, as both DMCA directory addresses and as the contact address in the Terms, Privacy Policy and emails, once the Copyright Office (or a lawyer) confirms it is accepted? Round 1's "P.O. box with a free waiver" was wrong: a P.O. box covers only the agent's address. | Yes; fallback: a P.O. box for the agent plus a waiver request | [The address](../../security-privacy/operator-liability-and-policies-round-2.md#the-public-address-l4-a-correction) |
| R2-7 | Which US state do you live in? It sets an LLC's yearly cost, from $0 (New Mexico) to $800 (California), and forming in another state usually means paying both. | Name the state. Either way, no LLC now; form one when the paid tier opens publicly if it costs about $100 a year or less there | [LLC](../../security-privacy/operator-liability-and-policies-round-2.md#should-the-operator-form-an-llc-l5) |
| R2-8 | H5, disk encryption on the node, given `system.autoUpgrade` with `allowReboot = true`: full-disk LUKS with remote unlock, encrypt only the data volumes, or accept the disk as is? | No recommendation; a trade-off for you (options below) | [Supply chain and host](../../security-privacy/production-hardening.md#supply-chain-and-host) |

The H5 options (R2-8), described neutrally:

- **Full-disk LUKS with remote unlock** (for example SSH into the initrd, or
  TPM, as round 1 named). Everything on the disk is encrypted at rest,
  including account rows, secrets, backup staging and logs. An unattended
  reboot stops at the unlock prompt until someone unlocks it remotely
  ([production-hardening.md](../../security-privacy/production-hardening.md#supply-chain-and-host)),
  so the site is down until then. The effort of converting the existing disk
  was not researched.
- **Encrypt only the data volumes** (for example Postgres, Garage, backup
  staging and the secrets). The system boots and stays reachable after an
  unattended reboot; the data stays locked until those volumes are unlocked.
  How they are unlocked after a reboot decides how much of the reboot problem
  remains; this was not researched.
- **Accept the disk as is.** Unattended reboots keep working. Zero-access
  still covers stored content (PDFs and sealed columns), but account rows
  (names, emails), secrets in the env file, backup staging and logs are
  readable by anyone who gets the disk.
  [pdf-and-annotation-data-protection.md](../../security-privacy/pdf-and-annotation-data-protection.md)
  assumed LUKS and would need updating.

## Fix regardless of decisions

Two live defects found during research, both confirmed first-hand. Neither
depends on any question below. **Both fixed**: #31
[`what-the-research-found`](../../../features/what-the-research-found/description.md),
F1 in #265 and F2 in #266 (2026-10-20).

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

## Round 3 (2026-11-12): after the round-2 answers

The answers are verbatim in
[answers-2026-11-12.md](./answers-2026-11-12.md#answers-to-the-round-2-questions-as-written).

**Decided:**

| # | Decision |
|---|---|
| R2-1 | **Sign-in stays Google OAuth only. No app-level 2FA.** |
| R2-2 | The recovery code is optional, generated or reset from the settings menu, and is not asked for at sign-up. |
| R2-3 | **Encrypt everything in E4**, including the fold state and annotation page numbers. Each device decrypts what Zero syncs into the React views, and encrypts each write before it is sent. **Costs:** the fold state becomes a whole-value write, so two devices folding at the same moment keep the later write. Annotations are sorted by page in the browser. |
| R2-4 | Citation links to the rest of the library are computed in the browser, which has the decrypted library, **as soon as the upload's processing finishes** while the app is open. If the app is closed before then, they are computed the next time it opens. This is as immediate as zero-access allows: the server cannot read the rest of the library. |
| R2-5 | Scan each upload with a cloud CSAM service **before** the extraction pipeline, and run the pipeline only on a pass. |
| R2-6 | No virtual mailbox until there is revenue. |
| R2-7 | California, so an LLC costs $800 a year (a $400 first year in 2027–2029). **No LLC now.** |
| R2-8 | The node's disk stays as it is, with no LUKS. |

**The constraint behind R2-1 and R2-2: Google sign-in alone cannot unlock a zero-access key.**
- With OAuth, the user's credentials never reach this app. Google gives the
  server a token, and anything the browser could derive from what Google
  sends, the server could derive too.
- So a key that "only the user, not the server" can use has to be held by
  something the server never sees:
  - a key stored on a device, made in that device's browser;
  - a passkey with PRF, held by the user's password manager;
  - a recovery code.
- A device gets the key at first use. A second device gets it by approval
  from a device that has it, or from a passkey or recovery code. No
  per-sign-in step is needed.
- **The risk with nothing durable saved:** a browser keeps site storage only
  so long.
  - Safari deletes a site's storage after 7 days of browser use without
    visiting it.
  - Clearing browsing data deletes it too.
  - A user with one device and no passkey or recovery code would lose the
    whole library to that, which is far likelier than the "lost every device"
    E2 accepted.

**Round 3 questions:**

| # | Question | Recommended |
|---|---|---|
| R3-1 | How a library key survives:<br>**(A)** one prompt, once, the first time a paper is saved: "save your library key" as a passkey (one Face ID or fingerprint tap; syncs through iCloud or Google Password Manager) or as a recovery code. It is a key, not a sign-in step.<br>**(B)** nothing prompted: a recovery code and passkey only if the user goes to settings, accepting that clearing browser data on the only device loses the library.<br>**(C)** step back from zero-access to server-held per-user keys: OAuth only and no user steps, but the operator could read data. | (A) |
| R3-2 | Until a scanner approves this site, are uploads processed unscanned (there is no duty to scan), or refused? Apply to which services first? | Process meanwhile. Apply to Tech Coalition Pathways (PhotoDNA) and to Microsoft's PhotoDNA Cloud Service. Project Arachnid Shield is the fallback, since it sends image bytes to Canada. |
| R3-3 | The DMCA agent without a street address:<br>**(a)** defer registration until there is revenue. This gives up the §512(c) safe harbor meanwhile, but nothing is shared, and notices are still handled by the runbook through an email contact.<br>**(b)** a USPS P.O. box for the agent (about $21–$100+ every 6 months) plus a waiver request for the provider address (granted only in exceptional circumstances). | (a) |

## Round 4 (2026-11-12): after the round-3 answers

The answers are verbatim in
[answers-2026-11-12.md](./answers-2026-11-12.md#answers-to-the-round-3-questions-as-written).

**Decided:** R2-6 (a). DMCA agent registration is deferred until there is
revenue, and nothing is shared between users. Notices are still handled by the
runbook, through an email contact.

**R3-1: the user chose (C), with minimal friction on a new device, and asked
whether OAuth can unlock the key.**

What OAuth can and cannot do:
- An OAuth sign-in proves to *this server* who the user is. It does not give
  the user any secret the server lacks: the server runs the sign-in and sees
  everything Google returns.
- So a key that "only the OAuth login can decrypt" is in practice a key the
  server unwraps for a signed-in session. That is (C), not zero-access.

(C) can still be built as the user described, and it is far from pointless
when the keys are not kept beside the data:
- Each user has a random data key, stored only **wrapped** (encrypted) by a
  server master key. The master key lives in the host's secret file, never in
  Postgres, Garage or the backups.
- After Google sign-in, the browser asks for its key. The server checks the
  session, unwraps the key and returns it over TLS. The browser holds it in
  memory.
- **Zero syncs only ciphertext.** The browser decrypts into the views and
  encrypts each write. Postgres, zero-cache's replica, the browser's
  IndexedDB, Garage and the off-site backups hold ciphertext only.
- It protects against:
  - leaked or stolen backups, and a copied database or bucket;
  - an admin query or dashboard showing content by mistake;
  - **crypto-shredding**: deleting a user's wrapped key makes every copy,
    old backups included, unreadable at once. That resolves BK10.
- It does **not** protect against the operator, or anyone controlling the
  running server, who can unwrap any key. With the node's disk unencrypted
  (R2-8), someone holding the whole disk has the master key and the data
  together, though not the off-site backups.
- New devices: zero friction. Sign in with Google and everything opens.
- Upload processing, backfills and citation linking may run on the server
  again. The server can unwrap with the job's consent or by policy; E7 consent
  becomes optional.

The alternative with near-minimal friction is still on the table: zero-access,
with a passkey as the library key. On a new device in the same ecosystem
(iCloud Keychain, Google Password Manager), the only step is one Face ID or
fingerprint tap at first use.

**R2-5: why vetting.** The services do not exclude individuals by rule.
Access to PhotoDNA and to hash lists is restricted "due to the sensitive
nature of the technology" ([Wikipedia](https://en.wikipedia.org/wiki/PhotoDNA))
and is granted to vetted, qualifying organizations
([IWF hash list](https://iwf.org.uk/our-services/hash-list)). The eligibility
criteria are not published, so an individual's application is uncertain
rather than refused. Applicable free services:
- Tech Coalition Pathways (PhotoDNA);
- Microsoft PhotoDNA Cloud Service;
- Google's Content Safety API
  ([overview](https://stellapolaris.childhood.se/digital-tools-combating-child-sexual-abuse/child-abuse-material-removal-and-blocking));
- Project Arachnid Shield.

**Open:**
- R4-1: confirm (C) server-held keys, as designed above, over zero-access with
  a one-tap passkey.
- R3-2: until a service approves this site, process uploads unscanned or
  refuse them.

## Round 5 (2026-11-12): a key unlocked by the OAuth provider

The user asked whether the OAuth provider itself can supply the decryption
capability, so that the server holds no master key. They accept that the
server sees the key in passing.

**Standard OAuth/OIDC hands out no stable per-user secret.** The ID token
and access token change with every sign-in, and the user id (`sub`) is not
secret. But Google offers a place the key can live that only the user's
Google sign-in unlocks:
- **The Drive application data folder (`appDataFolder`).** It is a hidden,
  per-app folder in the user's own Google Drive, reachable only by this app
  with a token from that user's sign-in.
  - Scope `drive.appdata`, which Google lists as **non-sensitive** and
    recommended; it needs only basic app verification
    ([Drive scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)).
  - Its contents are "only accessible by your app" and "hidden from the user
    and from other Google Drive apps", but **the user can delete the folder
    manually**
    ([appdata guide](https://developers.google.com/workspace/drive/api/guides/appdata?authuser=9)),
    under Drive settings → Manage apps → Delete hidden app data
    ([third-party description](https://workalizer.com/insights/drive/still-full-after-deleting-files-check-your-google-drive-dashboard-for-hidden-app-data/);
    *the exact label is unconfirmed in Google's own help*).

**The design ("the key lives with Google"):**
- **First sign-in:** a random data key is made and written to the user's
  appDataFolder. Our server stores no key, wrapped or otherwise.
- **Each Google sign-in:** the sign-in's fresh token reads the key from Drive.
  The server passes it to the browser and discards the token. The browser
  keeps the key on that device, so later visits need nothing. If the browser
  storage is cleared, signing in with Google again fetches it again.
- **Zero syncs ciphertext only.** The browser decrypts into the views and
  encrypts each write (R2-3). Postgres, zero-cache, IndexedDB, Garage and
  the backups hold only ciphertext, and **nothing on the server or in a
  backup can unlock it**.
- **Uploads** are processed in memory with the key from the user's session,
  then sealed. **Old papers** are re-processed only while the user is present
  (E7 consent, which now follows naturally).
- **Deletion:** delete the Drive file while the user is signed in, plus our
  data. Old backups become unreadable (BK10).

**Caveats to weigh:**
- Better Auth by default stores Google's access and refresh tokens in
  `account`. A stored refresh token would let the server read the key at any
  time, quietly undoing the point. Planning must make sure no refresh token
  is requested or kept and the access token is dropped after use.
  *To verify against Better Auth's options.*
- A compromised running server can read keys of users who sign in while it
  is compromised (accepted by the user).
- If the user deletes the hidden app data, or loses their Google account,
  the library becomes unreadable. The optional recovery code (R2-2) is the
  backstop.
- A Google Workspace account whose administrator has disabled Drive cannot
  hold the key. *Uncertain how common this is; a fallback is needed.*
- The consent screen gains "See, create, and delete its own configuration
  data in your Google Drive".
- This is Google-specific. Another OAuth provider added later needs its own
  key home.

**Open:**
- R5-1: adopt this design.
- R3-2: until a scanner approves this site, process uploads unscanned or
  refuse them.

## Round 6 (2026-11-12): R5-1 decided; CSAM services re-examined

**R5-1: decided.** The library key lives in the user's Google Drive
`appDataFolder`.
- **At account creation**, a disclaimer says where the key is kept, and that
  deleting the hidden app data permanently disables access to all account
  data. It also says a recovery code can be generated in the profile settings
  as a backup.
- **Two ways to unlock, as the user specified.** One random library key (DK)
  encrypts the data, directly or through per-item keys. DK can be recovered
  in either of two ways:
  1. **from the user's Drive** (`appDataFolder`), read with the sign-in's
     token;
  2. **from the recovery code.** A key is derived from the code (a KDF such
     as Argon2id or HKDF over a high-entropy random code) and wraps DK. Only
     that wrapped blob is stored on the server, which is safe because the
     code never reaches the server and is too long to guess.
- Generating or resetting the code in settings re-wraps DK under the new code
  and deletes the old blob. DK itself, and so the data, is unchanged.

**R3-2: there *are* cloud CSAM services. None is sign-up-and-go**, because
access to hash lists and matching is vetted ("due to the sensitive nature of
the technology"). Several are aimed squarely at small platforms:

| Service | What it is | Fit |
|---|---|---|
| **IWF Image Intercept** | Hash-matching of image and video uploads against the IWF's list; **free for platforms under 1 million checks a month**; built "for smaller companies and start ups". Apply through the IWF's interest form ([IWF](https://www.iwf.org.uk/our-technology/image-intercept), [IFTAS](https://about.iftas.org/2025/07/29/iwf-offers-fediverse-a-way-to-block-csam)) | **Best fit.** Framed around the UK Online Safety Act; non-UK eligibility is *unconfirmed* |
| **Project Arachnid Shield (C3P)** | Free API that matches media against C3P's fingerprints; account request form ([register](https://projectarachnid.ca/en/api/accounts/register/), [overview](https://casescan.com/blog/best-csam-detection-tools/)) | Good. Sends media to a Canadian organization; eligibility criteria not published |
| **Cyacomb Safety** | SDK plus access key matching uploads against IWF lists; piloted with Blipfoto, a volunteer-run service; integration "well under £5,000" ([IWF pilot](https://www.iwf.org.uk/news-media/blogs/new-pilot-shows-way-for-smaller-platforms-to-play-big-part-in-online-safety/)) | Possible. Licence price not public |
| **Microsoft PhotoDNA Cloud / Tech Coalition Pathways** | Free for qualified organizations | Possible. Vetting case by case |
| **Google Content Safety API / CSAI Match** | Free for qualifying partners | Possible. Vetting |
| Cloudflare CSAM Scanning | Free; no longer needs NCMEC credentials ([IFTAS](https://about.iftas.org/library/csam-detection/)) | **Not applicable**: it scans only images served from Cloudflare's cache; uploads and stored ciphertext are not |
| Thorn Safer, CaseScan, Hive | Commercial; Safer by custom contract, CaseScan about $25k a year ([AWS listing](https://aws.amazon.com/marketplace/pp/prodview-dfwekn4bx4ake), [roundup](https://casescan.com/blog/best-csam-detection-tools/)) | Too costly at this scale |

All of them match **images**. The upload stage extracts the images embedded
in the PDF in memory and checks those.

**Open:** R3-2. Until one service approves, are uploads processed unscanned or
refused? Apply to IWF Image Intercept and Arachnid Shield first.

## Round 7 (2026-11-12): what scanning sets in motion legally

*Research, not legal advice.* The user asked what happens legally if scanning
finds CSAM, and whether a cloud service would file a case naming them.

- **The reporting duty is the operator's, and the operator is the reporter,
  not the subject.**
  - On actual knowledge, a provider must report to NCMEC's CyberTipline "as
    soon as reasonably possible" (18 U.S.C. §2258A). NCMEC passes reports to
    law enforcement.
  - A report describes the **uploader**: account, IP address, time, file. The
    operator's contact details appear as the reporting provider, so that law
    enforcement can ask for more.
  - Scanning vendors generally do not file reports for the platform:
    Cloudflare's docs say operators "are still expected to … file their own
    reports" (see round 2), and Microsoft gives NCMEC aggregate match counts
    only.
- **Legal protection for reporting.** §2258B bars civil claims and criminal
  charges against a provider "arising from" its reporting and preservation
  duties, except for intentional misconduct or actual malice. The REPORT Act
  (May 2024) raised preservation to **1 year** and extended NCMEC's
  limited-liability protection to NCMEC's own contracted vendors
  ([WSGR](https://wsgr.com/en/insights/new-minor-safety-obligations-for-online-services-report-act-expands-child-sexual-exploitation-reporting-requirements.html),
  [Thorn](https://www.thorn.org/blog/the-report-act-explained/)).
  - *Uncertain:* whether sending a file to a third-party scanner *before*
    knowledge is itself covered. Hash-only services avoid the question.
- **Whether imagery leaves the server depends on the service.**
  - PhotoDNA Cloud receives the image, or a URL to it, and hashes it in the
    cloud
    ([third-party integration guide](https://help.withpersona.com/articles/1GLwOKRvCzuaphwwUD0E7s.md)).
  - Cyacomb matches against IWF lists "without compromising users' privacy"
    through an SDK (see round 6), so matching appears to be local.
  - IWF Image Intercept and Arachnid Shield: *whether they take hashes or
    media is unconfirmed.*
  - **Prefer a hash-only service**, so that no image leaves this server.
- **Reporting carries some risk.** In *Lawshe v. Verizon* (2025), Verizon and
  its cloud vendor had to face a suit over a mistaken report: §2258B did not
  end it at the pleading stage
  ([Goldman](https://blog.ericgoldman.org/archives/2025/03/verizon-and-its-cloud-vendor-must-face-lawsuit-for-reporting-csam-that-wasnt-lawshe-v-verizon-guest-blog-post.htm)).
- **Once there is a match:** report, preserve for 1 year in restricted
  storage, disable the account, never open the file, and call a lawyer (the
  round-2 runbook).
- **Without scanning,** knowledge, and so the duty, arises only if someone
  tells the operator.
- **Recommendation:** a lawyer's one-time review before scanning is switched
  on, because it creates automatic legal duties. Use a hash-only service.
  Until then, process uploads unscanned (R3-2).
