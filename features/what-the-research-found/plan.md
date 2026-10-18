# Plan: What the Research Found

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`signing-in-is-not-shared`](./tasks/signing-in-is-not-shared/description.md) | [#263](https://github.com/nicbk/nicbk-website/issues/263) | Better Auth told it cannot identify clients, so it stops sharing one limit across the site |
| 2 | [`a-deleted-account-leaves-nothing`](./tasks/a-deleted-account-leaves-nothing/description.md) | [#264](https://github.com/nicbk/nicbk-website/issues/264) | A purge job per deleted account, queued by Better Auth's `afterDelete` and by a sweep at worker start |

Independent of each other. Task 1 is one setting; task 2 is a queue and a
storage function.

## Risks

- **Task 1 removes Better Auth's rate limiting until real client IPs exist.**
  - Sign-in is Google OAuth: there is no password to guess, and each request
    only starts a redirect.
  - The remaining exposure is volume, which a site-wide limit could not have
    stopped either: one abuser would have used up everyone's budget.
  - H2 (real client IPs) restores per-client limits.
- **Task 2 deletes data.**
  - Every key is derived from the user id and checked with `isOwnedBy`, as the
    article cleanup does.
  - The job deletes nothing while the user still exists.
  - The sweep only acts on prefixes whose user row is gone.
