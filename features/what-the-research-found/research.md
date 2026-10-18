# Research: What the Research Found

Both defects were found by the research of 2026-10-14 and confirmed first-hand
in this repository and in the installed packages.

## F1: the shared rate-limit bucket

- [../../research/devops-deployment/hosting-and-infrastructure.md](../../research/devops-deployment/hosting-and-infrastructure.md),
  "Return-path masquerade": the relay masquerades public flows onto the tunnel,
  so the node sees every client as `10.100.0.1`. That is the known cost of
  keeping the relay a dumb forwarder.
- Better Auth 1.6.25, `better-auth/dist/api/rate-limiter/index.mjs`:
  - rate limiting keys on `getIp(request)` plus the path;
  - the default special rule gives `/sign-in*` 3 requests per 10 s, and other
    paths get 100 per 10 s;
  - when no client address can be found, it warns and uses "a single shared
    per-path bucket";
  - with `advanced.ipAddress.disableIpTracking`, it skips rate limiting
    instead (`resolveRateLimitConfig` returns null).
- `@better-auth/core/dist/utils/ip.mjs`: `getIp` reads `x-forwarded-for` by
  default. Behind Caddy that header is the relay's address, the same for
  everyone.
- The browser calls these Better Auth HTTP endpoints:
  - `sign-in/social` (`sign-in-page.tsx`, `delete-account.tsx`);
  - `sign-out` (`user-settings.tsx`);
  - `delete-user` (`delete-account.tsx`).

  Session reads go through `auth.api.getSession` on the server, which is not
  rate limited.
- [../../research/security-privacy/production-hardening.md](../../research/security-privacy/production-hardening.md),
  "Found during research: live defects".

## F2: account deletion leaves PDFs

- `src/zero/server-effects.ts`: only `articles.delete` queues a PDF cleanup.
- `src/auth/create-auth.ts`: `deleteUser` is enabled with no hook. Postgres
  cascades every row from `user`, but Garage is not Postgres.
- Better Auth 1.6.25:
  - `deleteUser.afterDelete(user, request)` is called after the user and
    their sessions are gone (`api/routes/update-user.mjs`);
  - it is awaited, so a throw would turn a completed deletion into an error
    response.
- `src/storage/object-key.ts`: a user's PDFs all live under
  `lit-tracker/<userId>/`. Better Auth user ids are 32 random characters and
  are never reissued
  ([../../research/system-architecture/roles-and-administrators.md](../../research/system-architecture/roles-and-administrators.md)),
  so a prefix whose user is gone can only belong to a deleted account.
- The pattern to reuse is the PDF cleanup job (`pdf/cleanup-stage.ts`): a
  pg-boss job, ids in the payload, keys derived and ownership-checked, and
  idempotent deletes.
