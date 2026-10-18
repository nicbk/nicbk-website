# Roles and Administrators

Researched: 2026-10-14. Decided: not yet — awaiting the user.

How the three kinds of account (administrator, paid, regular) are identified
and resolved, how administrators are named in `.env` without a reusable
identifier, and how admin dashboards stay unable to see user content. Answers
**R1–R7** of [roles-and-billing.md](../requests/2026-10-14/roles-and-billing.md),
the enforcement side of **D1–D4** and **D7** in
[admin-dashboards.md](../requests/2026-10-14/admin-dashboards.md), and **U1**
(the profile shows the role) in
[profile-role-and-quota.md](../requests/2026-10-14/profile-role-and-quota.md).
Builds on Better Auth ([../technologies/auth.md](../technologies/auth.md)) and
on the per-user scoping in [data-sharing-boundaries.md](./data-sharing-boundaries.md).
The processor behind "paid" is in
[../technologies/payment-processor.md](../technologies/payment-processor.md);
limits and metering in [quotas-and-usage-metering.md](./quotas-and-usage-metering.md).
Every question below is collected in
[decisions.md](../requests/2026-10-14/decisions.md).

**Summary.**

- **Administrators are named by Better Auth `user.id`** in an
  `ADMIN_USER_IDS` env variable. The id is 32 random characters, never derived
  from anything the person controls, so a re-created account gets a new id.
  This meets R5. Email fails R5; Google's `sub` comes back if the same Google
  account re-registers.
- **Do not install Better Auth's admin plugin.** Its impersonation would let an
  admin read a user's papers, contradicting D7. A ~15-line `isAdmin()` check is
  smaller and adds no schema or endpoints.
- **"Paid" is a subscription mirror table written only by the payment webhook.**
  One server function, `resolveRole(userId)`, decides: admin (env) > paid >
  regular.
- **Admin dashboards are REST endpoints behind one `requireAdmin()` guard**
  that answers 404 to everyone else, reading only account, subscription and
  usage tables — ideally through a Postgres role with no grant on content
  tables, which makes D7 true by construction.

Source caveat: only GitHub raw content was reachable, so Better Auth, Zero,
Caddy and Postgres docs were read from their GitHub sources, plus the installed
Better Auth package. The statement that Google never reassigns `sub` is
**second-hand** (a search summary of Google's reference page) and must be
re-checked before it is relied on.

## Options

### Which identifier names an administrator (R5)

Better Auth's default id generator is
`createRandomStringGenerator('a-z','A-Z','0-9')(32)` — verified in the
installed Better Auth 1.6 package. It draws from `crypto.getRandomValues` with
rejection of biased bytes: about 2^190 possibilities. This project sets no
`generateId`, so it uses the default (`user.id` is `text` in
`src/db/schema/identity.ts`). Deletion removes the row; nothing allocates ids
from a pool, so "reuse" would mean drawing the same random value again.

| Identifier | Same person deletes and re-creates | A *different* person ends up with it | For R3–R5 |
|---|---|---|---|
| **Better Auth `user.id`** | New random id | No | **Meets R5** |
| Google `sub` (`account.accountId`) | **Same `sub` returns** | No, per Google *(second-hand)* | Fails "never re-appears" |
| Email | Returns | **Yes**: addresses can be reassigned (Workspace, school, employer) | Fails: exactly the attack R5 describes |

Better Auth also links a Google login to an existing user *by email*. That is
not an escalation path for id-based admin (an attacker gets their own row and
id), but it is another reason never to key on email.

### Better Auth admin plugin, or an own check

| Option | For | Against |
|---|---|---|
| A. Admin plugin with `adminUserIds` | Off-the-shelf endpoints; `adminUserIds` matches "ids in env" | Adds **impersonation**, ban, set-role, remove-user; four `user` columns and `session.impersonatedBy`; a `role` column admins can write (R3 says admins come only from `.env`); still no `isAdmin` for the app's own routes or for "paid" |
| B. Plugin with trimmed access control | Keeps list-users | Same schema and surface; list-users returns whole user rows; fragile across upgrades |
| **C. Own check** | ~15 lines, no schema change, no hidden endpoints, trivially tested | The small admin endpoints are written by hand |

Own-check details: parse `ADMIN_USER_IDS` (comma-separated) in `src/env.ts`;
**validate each entry as `^[A-Za-z0-9]{32}$`** so a pasted email or Google `sub`
fails startup loudly, which enforces R5 at the door. Compare against
`session.user.id` from the validated cookie session, never request input. An
id matching no account does nothing (a log line may count configured ids, but
must not fail startup: the admin may not have signed in yet). Bootstrapping: the
admin signs in once, then reads their id — from the profile pop-up, or `psql`.

### Where "paid" lives and how the role reaches the app

| Option | For | Against |
|---|---|---|
| `role` column on `user` (Better Auth `additionalFields`, `input: false`) | Arrives with the session | A flag with no history or period end; out-of-order webhooks are harder to apply idempotently; forgetting `input: false` is a privilege bug |
| **Subscription mirror table, written only by the verified webhook and a reconcile job** | Holds status, period end, cancel-at-period-end, provider ids; neutral across processors | One more table |

With Stripe the plugin's own `subscription` table can be this mirror; with
Polar the app adds its own (see
[payment-processor.md](../technologies/payment-processor.md#better-auth-integration-this-project-is-on-16)).

`resolveRole(userId)`: id in the env set → `admin`; else an active subscription
(or cancelled but before its period end) → `paid`; else `regular`. Used by the
upload route, the PDF route, the profile and the admin routes — one function,
not re-derived per route.

- **Zero:** `ZeroContext` is deliberately just `{ id }`
  (`src/zero/context.ts`). No current query needs the role, so do not widen it.
- **Client (U1):** a `GET /api/account/plan` returning role, limits, usage and
  subscription, refetched after upload, PDF open and return from checkout. Do
  not put the role in the Better Auth session: `src/auth/session-cache.ts`
  caches the session once per page load, so a role change after checkout would
  stay stale until reload. (`customSession` could add role to the session, but
  its current docs were not verified.)
- **Administrators are fixed by `.env`:** they cannot choose "paid" or change
  role from the profile, and an admin's subscription is ignored (questions RB8,
  and see U4 in the request).

### Admin dashboards without content access (D1–D4, D7)

Everything the user named comes from `user` (id, name, email, created), session
activity, the subscription mirror, the storage ledger and the bandwidth table
(defined in [quotas-and-usage-metering.md](./quotas-and-usage-metering.md)) —
never `articles`, `annotations` or `tags`.

- **Site dashboard (D3):** accounts total and by role; sign-ups per day/week;
  active accounts in 7/30 days; total bytes stored and transferred this month
  per app; share of regular users near their cap; subscription starts and
  cancellations; upload job failure rate.
- **Per-app dashboard (D6):** per user: id (or name/email, question RB15),
  role, sign-up date, last active, bytes stored, bytes transferred this month,
  percent of cap. Nothing else.
- **Excluded because they reveal content:** per-user paper counts, titles,
  filenames (`upload_jobs.filename`), tags, annotation counts, reading status,
  extraction results. A platform-wide paper count is probably fine; a per-user
  one is borderline.

Enforcement:

1. **One guard**, `requireAdmin(request)`: resolve the session, check
   `isAdmin`, otherwise **404** (anonymous gets 401, the same non-revealing
   style as the PDF route). Every admin route starts with it. Hiding the
   navbar tab (D2) is UX only.
2. **Admin data over REST, not Zero**, so the guard is the single boundary and
   per-user rows never land in an admin's local store.
3. **A read-only Postgres role** (`admin_stats`) with column-level
   `GRANT SELECT (id, name, email, created_at)` on `user` and `SELECT` on the
   subscription, ledger and usage tables; no grant on content tables or
   `upload_jobs.filename`. Admin handlers use a second pool logged in as that
   role. Cost: one migration, one extra connection string, a test that
   `SELECT * FROM articles` fails on that pool. This is the piece that makes
   "unable to view" a property of the system rather than of code review.
4. **No admin write actions** (set role, delete account, reset quota) — none
   were requested. Impersonation is out by design.
5. Do not log admin response bodies (they contain personal data); log each admin
   view to the audit log ([production-hardening.md](../security-privacy/production-hardening.md#headers-sessions-admin-dos-incident-response)).
6. Tests: anonymous, signed-in non-admin, admin removed from env, id of a
   deleted user — per route.

Under zero-access encryption
([user-data-encryption.md](../security-privacy/user-data-encryption.md)) these
statistics still work: they come from tables written at upload and download
time, and ciphertext only reveals its length.

## Recommendation

*A recommendation, not a decision.*

1. Admin identity = Better Auth `user.id` in `ADMIN_USER_IDS`, validated at
   startup as 32 alphanumeric characters; own `isAdmin()`; no admin plugin.
2. Paid = a subscription mirror written only by the webhook; `resolveRole()` is
   the single source for every route; `ZeroContext` stays `{ id }`.
3. Show every user their own id with a copy button in the profile, which
   solves admin bootstrapping without `psql`.
4. Admin dashboards = REST behind `requireAdmin` (404 otherwise), reading only
   account, subscription and usage tables through a column-restricted Postgres
   role.

## Reasoning

- The random `user.id` is the only identifier that satisfies R5 by
  construction; the startup format check stops the two identifiers that do not.
- The admin plugin's main features are exactly what D7 forbids, and it does
  not cover "paid" anyway; its one useful piece (`adminUserIds`) is a set
  lookup.
- Deriving the role from env plus a webhook-written mirror keeps both sources
  of truth outside anything a user or admin can write through the app.
- A restricted database role is defence in depth: a buggy admin handler still
  cannot read content.

## Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **RB6.** Going down to a lower role while over its storage cap (U6): keep
  files readable and block new uploads until under the cap (recommended), or
  delete? If delete: which files, after how many days?
- **RB8.** Can an administrator also be paid, or is checkout hidden for admins
  (recommended: hidden; admin is fixed by `.env`)?
- **RB13.** How does an admin learn their own id: shown with a copy button in
  everyone's profile, or `psql`?
- **RB14.** Use an own `isAdmin()` check instead of Better Auth's admin plugin?
- **RB15.** May admins see names and emails? Per-user paper counts? A
  platform-wide paper count?
- **RB16.** Is a second, read-only Postgres role for admin endpoints acceptable
  extra setup?

Not covered by the research and left to the plan: the role-change UI (U4–U7),
and what the profile shows outside any app, e.g. on the blog (U2).

## Sources

- [Better Auth — database concepts](https://raw.githubusercontent.com/better-auth/better-auth/main/docs/content/docs/concepts/database.mdx) — id generation options; `additionalFields` with `input: false`.
- [Better Auth — admin plugin](https://raw.githubusercontent.com/better-auth/better-auth/main/docs/content/docs/plugins/admin.mdx) — `adminUserIds`, added columns, impersonation, access control.
- [Better Auth — users and accounts](https://raw.githubusercontent.com/better-auth/better-auth/main/docs/content/docs/concepts/users-accounts.mdx) — `deleteUser`, `beforeDelete`/`afterDelete`.
- [Better Auth — OAuth](https://raw.githubusercontent.com/better-auth/better-auth/main/docs/content/docs/concepts/oauth.mdx) — server-owned fields.
- [Better Auth — `id.ts`](https://raw.githubusercontent.com/better-auth/better-auth/main/packages/core/src/utils/id.ts), [`get-id-field.ts`](https://raw.githubusercontent.com/better-auth/better-auth/main/packages/core/src/db/adapter/get-id-field.ts), [`@better-auth/utils` random](https://raw.githubusercontent.com/better-auth/utils/main/src/random.ts) — default 32-character id from `crypto.getRandomValues`.
- Installed package (`node_modules/better-auth`, 1.6): `plugins/admin/has-permission.mjs` (`adminUserIds.includes`), `oauth2/link-account.mjs` (implicit linking by email), `social-providers/google.mjs` (`id: user.sub`); default id generator verified first-hand.
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) — `sub` unique and never reused; email not a stable key (**second-hand via search summary; re-verify**).
- [Postgres — GRANT](https://raw.githubusercontent.com/postgres/postgres/master/doc/src/sgml/ref/grant.sgml) — column-level `GRANT SELECT (cols)`.
- Repository: `src/auth/create-auth.ts`, `src/auth/session-cache.ts`, `src/db/schema/identity.ts`, `src/zero/context.ts`, `src/env.ts`.
