# The Requests of 2026-10-14

A list of features the user asked for on 2026-10-14. It is recorded here before
any research or planning so it survives context compaction, and every later
step starts from it. The user: *"every bullet point I wrote is important"*.

- [as-written.md](./as-written.md): the message, **verbatim**. It is the source
  of truth. Every file below quotes it.

## The requests and their path

| Request | File | Path the user set |
|---|---|---|
| A collapsible outline, saved per paper | [collapsible-outline.md](./collapsible-outline.md) | **Plan directly** → implement |
| User data privacy (client-side encryption?) and production hardening, with a migration job | [data-privacy-and-hardening.md](./data-privacy-and-hardening.md) | **Research** → plan → implement |
| Periodic backups sufficient to relaunch | [backups.md](./backups.md) | **Research** → plan → implement |
| Administrator, paid ($5/month) and regular roles | [roles-and-billing.md](./roles-and-billing.md) | **Research** → plan → implement |
| Storage and bandwidth quotas, and the limit pop-up | [quotas.md](./quotas.md) | **Research** → plan → implement |
| The profile shows the role and quota, and changes the role | [profile-role-and-quota.md](./profile-role-and-quota.md) | **Research** → plan → implement |
| Administrator dashboards: site-wide, and in the Literature Tracker | [admin-dashboards.md](./admin-dashboards.md) | **Research** → plan → implement |

## Every bullet, accounted for

Each bullet of [as-written.md](./as-written.md) appears below, in order, with
the requirement IDs that carry it. A bullet with no ID would be a dropped
request.

| # | The bullet begins | Carried by |
|---|---|---|
| 1 | "let's make the outline list collapsible…" | O1–O5 |
| 2 | "As other people start using my app publically…" | P1 |
| 2a | "(since the literature tracker is the current public facing app…" | P2 |
| 2b | "we already have separate document stores…" | P3 |
| 2c | "But, I want to add data privacy restrictions…" | P4 |
| 2c-i | "e.g. is it possible for us to use client-side encrypted data…" | P5 |
| 2d | "any other considerations for hardening the app…" | P6 |
| 2e | "furthermore, for existing users and data, we should create a job…" | P7, P8 |
| 3 | "well-defined periodic backup job…" | B1–B6 |
| 4 | "Design an administrator role for nicbk-website…" | R1–R5 |
| 5 | "Then, let's also design a "paid" account role…" | R8, R9 |
| 6 | "Regular users (with no role) should have total stored uploads limited to 25 MiB." | R12, Q1 |
| 7 | "Furthermore, the regular users should have total network bandwidth limited to 50 MiB per month." | Q2 |
| 8 | "Upon reaching such an account limit…" | Q3–Q6, R10, R11 |
| 9 | "We also update the profile pop-up to now include the current user role." | U1 |
| 10 | "In the current app, the profile also shows the current quota/limits…" | U2 |
| 10a | "e.g. for now since we have the literature tracker…" | U3, Q8 |
| 10b | "A user can also change their role from the profile pop-up." | U4 |
| 10c | "the change in quota that a user gets is conveyed to them…" | U5 |
| 10d | "furthermore, when changing roles is a destructive operation…" | U6 |
| 10e | "also if the user is going down a role…" | U7 |
| 11 | "Administrator accounts have no limit on storage or network bandwidth" | R6, Q7 |
| 12 | "Administrator accounts should have a new dashboard page…" | D1–D4, R7 |
| 13 | "From the literature tracker app administrators also have an in-app dashboard…" | D5, D6 |
| 13a | "and, given our user privacy constraints…" | D7 |
| — | "For the first feature on collapsible outline, we can plan the feature for that directly." | the path column above |
| — | "For all the new features on user data, backups, roles, and admin dashboards, we will need to do a research phase…" | the path column above |
| — | "…record down every feature in detail of how I wrote it in the research folder…" | this folder |

## How these requests depend on each other

The research phase should resolve these first, because the other requests
depend on the answers:

- **Client-side encryption** shapes almost everything else:
  - what the server can still do with a paper (extraction, contents, citations,
    search);
  - how the migration job can run;
  - what backups contain;
  - what admin statistics can be computed.

  It is the first research question.
- **Roles** come before quotas, the profile, and the dashboards. All three
  read the role.
- **Bandwidth metering** (what counts, and where it is measured) comes before
  the quota pop-up, the profile's usage display, and the per-user admin
  statistics. All three show the same number.
- **The payment processor** is needed before a user can move to "paid" from the
  profile.

## Progress

| Request | Research | Plan | Implementation |
|---|---|---|---|
| Collapsible outline | not needed | [#30 `the-contents-fold`](../../../features/the-contents-fold/description.md) | merged (#260, #261); phone check pending |
| Privacy and hardening | — | — | — |
| Backups | — | — | — |
| Roles and billing | — | — | — |
| Quotas | — | — | — |
| Profile role and quota | — | — | — |
| Admin dashboards | — | — | — |

Update this table as each step finishes. Link the research documents and
`features/` folders it produces.
