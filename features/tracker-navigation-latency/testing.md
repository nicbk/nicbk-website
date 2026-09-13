# Testing: Tracker Navigation Latency

Feature-wide tiers. Task specifics are in the task's own `testing.md`.

## Unit (Vitest, jsdom)

- **The cache answers twice from one resolution.** Two calls, one underlying
  fetch — which is the entire behaviour being bought.
- **It is not shared across documents in the way a server would share it.** The
  browser-only guarantee is asserted, not commented: the module must refuse to
  cache when there is no `window`, so a server bundle that ever imported it
  would resolve per request as it does today.
- **Forgetting works**, and the next call resolves again.
- **The guard's decision is unchanged** — `require-auth.test.ts` continues to
  pass untouched, because `requireSession` is not being modified.

## Integration

Nothing new. No table, no mutator, no route. The session's *own* integration
coverage (#6's) is unaffected: this changes how often the browser asks, not what
the server answers.

## Browser verification (record in status.md — primary evidence)

**Counted, not timed.** The defect was measured by counting `_serverFn`
requests per navigation; the fix is verified the same way, because the
milliseconds that matter are on the deployed host and a local measurement is a
lower bound with no network in it.

- Clicking from the collection into an article, back, and into an article again
  makes **zero** session RPCs after the first of the page load — against one
  per navigation today (211 ms, 380 ms, 172 ms measured).
- A **reload** re-validates: exactly one again, and the page still renders.
- **Signing out** from inside the tracker leaves for the public site, and
  navigating back to `/lit-tracker` lands on `/sign-in` rather than on an empty
  shell.
- A signed-out visitor asking for a tracker URL directly is still redirected,
  with `returnTo` intact.
- Console clean.

## Coverage

Ratchet applies (`node scripts/coverage-ratchet.mjs <current> <baseline>`).

## What this feature cannot prove

That the reader's navigation *feels* immediate on `nicbk.com`. The round trip is
gone, which is the thing that was measured and the thing that was removed; how
much of the remaining wait is Zero's first query or the reader's own wasm is a
different question, and one this feature does not claim to have answered.
