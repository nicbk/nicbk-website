# Constraints and Behavior: Session Resolved Once

The whole of [the feature's criteria](../../constraints-and-behavior.md), since
this is its only task. What follows is what that means for the code.

## Satisfied here

- **One resolution per page load.** The first call resolves; every later call
  gets the same answer without a request. Two calls, one fetch.
- **Concurrent callers share one resolution**, rather than racing into two
  requests — the cache holds the work, not only its result.
- **Clearing works**, and the next call resolves afresh.
- **The guard's behaviour is unchanged** for both answers: signed in, the
  session is returned; signed out, the redirect carries a sanitized `returnTo`.

## Must not regress

- `requireSession`'s pure decision logic and its existing tests.
- The initial server-rendered request, which resolves on the server as it does
  today.
- The sign-in page's return path.
- Every data path's own server-side authorization — untouched by definition,
  and named here because this is the task that could tempt someone to lean on
  the cache instead.

## Constraints particular to this task

- **The cache must not cache on the server.** The check is `typeof window`, and
  the test asserts the server behaviour directly: with no `window`, two calls
  make two resolutions. A comment would be a promise; this is a claim that can
  fail loudly.
- **Sign-out clears it in both places** — `user-settings.tsx`'s `signOut` and
  `delete-account.tsx` — at the point each succeeds, not in a listener that
  would have to be kept in step with them.
- **The cache is one module with one job**, and says in its own doc comment what
  it gives up: a session revoked elsewhere keeps the shell until a reload.
- **Nothing new is imported into the client bundle from the server half.**
  `fetch-session.ts` is the seam that keeps the database out of the browser; the
  cache wraps its client-facing call and must not disturb that.

## Cross-cutting

- Nothing user-facing: no control, no text, no focus change, so no new
  accessibility surface.
- No schema change, no new mutator, no new route.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
