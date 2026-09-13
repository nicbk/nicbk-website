# Constraints and Behavior: Tracker Navigation Latency

Acceptance criteria for **#13**. What must be true when it is done, what must
not have changed, and the constraints the implementation works under.

## Satisfied here

- **A client-side navigation inside `/lit-tracker` makes no session RPC**, after
  the first one of that page load. Measured the way the defect was: by counting
  `_serverFn` requests while clicking between the collection and an article.
- **At most one session RPC per page load**, and none at all if the answer can
  be had without one.
- **The guard still decides the same thing**: a signed-out visitor is redirected
  to `/sign-in` carrying the destination they asked for; a signed-in one is
  handed their session, unchanged in shape.
- **A reload re-validates.** The cached answer belongs to one document's
  lifetime and does not outlive it.
- **Signing out forgets it.** Sign-out and account deletion are client-side —
  neither reloads the page — so the cache must be cleared where they succeed, or
  a signed-out reader can navigate back into a shell they no longer have data
  for.

## Must not regress

- **The first request of a session.** SSR still resolves the session on the
  server, and a signed-out visitor still never sees the tracker.
- **The sign-in return path** (`returnTo`), including its sanitization — #6's,
  and untouched.
- **Everything that authorizes data**: the PDF proxy, the mutate endpoint, and
  Zero's read boundary all continue to resolve the session themselves from the
  request's own cookie. This feature must not become something they lean on.
- **`requireSession`'s decision logic**, which is pure and tested and stays
  exactly as it is.

## Constraints particular to this feature

- **The cache exists only in the browser.** This is the one that would be a
  security defect rather than a slow path: the server process serves every
  user's requests, so a module-level session cache in the server bundle would
  hand one reader's session to the next. The cache must be unreachable on the
  server, and a test must assert that rather than a comment promising it.
- **It caches the answer, not the permission.** Nothing may start treating the
  cached session as authorization — the rule that every data path resolves its
  own session stays exactly as decided, and this feature's own research says why
  that rule is what makes it safe.
- **One document's lifetime, not a duration.** No TTL, no timers, no expiry
  arithmetic: the cache is seeded once and cleared on sign-out. A number would
  be a guess, and guesses about freshness are what the decision deliberately
  declined.
- **The failure mode is stated, not hidden.** A session revoked elsewhere keeps
  showing the tracker's shell until the next full page load. That is recorded in
  the research, in the code, and in this file, because a reader of any of the
  three should not have to discover it.

## Cross-cutting

- WCAG 2.2 AA: nothing here is user-facing; no control, no text, no focus
  change.
- No schema change, no new mutator, no new route.
- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
