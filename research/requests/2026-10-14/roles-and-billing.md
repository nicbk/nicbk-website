# Request: Account Roles and Billing

Source: [as-written.md](./as-written.md): the administrator role bullet, the
"paid" role bullet, the "Regular users (with no role)" phrase, and
"Administrator accounts have no limit on storage or network bandwidth".
Path: **research → plan → implement**, per the user.
Related:
- [quotas.md](./quotas.md) for the limits each role gets;
- [profile-role-and-quota.md](./profile-role-and-quota.md) for how a user sees
  and changes their role;
- [admin-dashboards.md](./admin-dashboards.md) for what an administrator can
  do.

Builds on Better Auth, as decided in
[../../technologies/auth.md](../../technologies/auth.md) and
[../../security-privacy/session-and-auth-hardening.md](../../security-privacy/session-and-auth-hardening.md).

## The user's words

> Design an administrator role for nicbk-website:
> defined by hardcoded identifiers in the .env file (referencing BetterAuth
> accounts that are designated to be administrators). Note that we should
> reference unique IDs, not IDs that re-appear if an account is deleted then
> re-created (otherwise it may be possible to designate a current user as an
> admin, then they remove their account, then someone else creates an account
> with the same identifier as used in the .env file and then gains
> administrator status automatically).

> Then, let's also design a "paid" account role which bills at $5/month (we can
> research the best payment processor to use to hook into this).

> Regular users (with no role) ...

> Administrator accounts have no limit on storage or network bandwidth

## Requirements

### The three roles

| ID | Requirement | The user's words |
|---|---|---|
| R1 | There are three kinds of account: **administrator**, **paid**, and a **regular** user who has no role. | "Design an administrator role", "a "paid" account role", "Regular users (with no role)" |
| R2 | Roles are **site-wide** ("for nicbk-website"), not per app. Their limits are shown per app (see [profile-role-and-quota.md](./profile-role-and-quota.md)). | "Design an administrator role for nicbk-website" |

### Administrator

| ID | Requirement | The user's words |
|---|---|---|
| R3 | Administrators are named by **hardcoded identifiers in `.env`**, not granted in the app. | "defined by hardcoded identifiers in the .env file" |
| R4 | The identifiers reference **Better Auth accounts**. | "referencing BetterAuth accounts that are designated to be administrators" |
| R5 | The identifier must be **unique and never reused**. It may not be an email, a Google account ID, or anything else that can return after an account is deleted. The attack to prevent: admin deletes their account, someone else signs up, gets the same identifier, and inherits administrator status. | "we should reference unique IDs, not IDs that re-appear if an account is deleted then re-created (otherwise it may be possible to designate a current user as an admin, then they remove their account, then someone else creates an account with the same identifier as used in the .env file and then gains administrator status automatically)" |
| R6 | Administrators have **no limit on storage or network bandwidth**. | "Administrator accounts have no limit on storage or network bandwidth" |
| R7 | Administrators get a site dashboard and a per-app dashboard (see [admin-dashboards.md](./admin-dashboards.md)). They **cannot see user content**. | (the dashboard bullets) |

### Paid

| ID | Requirement | The user's words |
|---|---|---|
| R8 | A **"paid"** role that bills **$5/month**. | "a "paid" account role which bills at $5/month" |
| R9 | **Research the best payment processor** to hook it to. | "we can research the best payment processor to use to hook into this" |
| R10 | Paid limits: **5 GiB** total stored uploads and **1 GiB/month** network bandwidth (see [quotas.md](./quotas.md)). | (the pop-up bullet) |
| R11 | Its purpose, as the user frames it, is to **support the service's operating costs**. The wording users see should say so. | "to support the service operating costs" |

### Regular

| ID | Requirement | The user's words |
|---|---|---|
| R12 | A regular user has **no role**: the free tier. Its limits are **25 MiB** stored and **50 MiB/month** bandwidth (see [quotas.md](./quotas.md)). | "Regular users (with no role)" |

## Questions the research must answer

- **R5:** which Better Auth identifier is never reused. Is the user table's
  generated `id` random (UUID/nanoid-style) and never recycled? Confirm against
  Better Auth's current docs and this project's schema.
- **How `.env` admins are enforced:**
  - read at start, checked on the server;
  - is it a Better Auth role (the admin plugin), or a check of our own;
  - what happens when an ID in `.env` matches no account.
- **R9, payment processor:**
  - candidates are Stripe, Paddle, Lemon Squeezy and Polar;
  - compare merchant-of-record and sales tax/VAT handling, fees on a $5
    charge, the open-source constraint (an SDK vs a hosted checkout), webhook
    reliability, and whether Better Auth has a plugin for it.
- **The subscription lifecycle:**
  - upgrade, renewal and a failed payment;
  - cancellation, and when the role drops: at once, or at the period's end;
  - refunds.
- **Can an administrator also be "paid"**, or change role from the profile?
  Reading: admin is fixed by `.env`, so it is not one of the roles a user can
  pick. To confirm with the user.
