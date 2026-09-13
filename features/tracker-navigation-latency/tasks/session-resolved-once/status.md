# Status: Session Resolved Once

**State:** **Merged.** The feature's only task, and the feature is complete.

- Branch: `tracker-navigation-latency/session-resolved-once`, from `main` at
  `3e426bc`.
- Sub-issue: [**#136**](https://github.com/nicbk/nicbk-website/issues/136).
- PR: [**#138**](https://github.com/nicbk/nicbk-website/pull/138) — merged
  2026-09-12 behind green CI and review, as `9e23bd9`.
- Parent issue **#135** was checked on merge and had not closed itself; it was
  closed by hand. That is a counter-example to the previous day's revision and
  is recorded as the 2026-09-12 addendum in
  [issue-and-pr-lifecycle.md](../../../../research/project-management-conventions/issue-and-pr-lifecycle.md).

## Why this task exists

Measured on 2026-09-12: every client-side navigation inside `/lit-tracker`
blocks on one session RPC — 211 ms, 380 ms and 172 ms locally, with no network
at all — while the server-side work behind it costs 8–19 ms. On the deployed
host that trip is about one RTT, ~110–130 ms, in front of every move.

## What shipped

`src/auth/session-cache.ts` — one module, two exports. `resolveSession()` holds
the *promise* of the first resolution, so a burst of navigations joins one ask
rather than starting several; `forgetSession()` drops it. `requireAuth` resolves
through it instead of calling the server function directly, and `requireSession`
is untouched. Outside a browser it caches nothing and calls straight through.

## Open items, settled

- **The first client navigation still pays.** Counted in Chrome: five client
  navigations (collection → article → back → article → back → article) made
  **one** session RPC, and it was the first. The server's own answer from the
  SSR pass does not reach the browser — route context is not among what
  TanStack Start serializes — so the honest outcome is what the acceptance
  criteria promised, *at most one per page load*, not zero. Getting that last
  one would mean serializing a session into the document, which is a different
  decision than this feature made.
- **Clearing lives at the two success sites**, as planned — and the alternative
  turned out to be unavailable rather than merely larger. For the cache to
  subscribe to Better Auth's store it would have to import `auth-client`, and
  the cache is imported by `require-auth.ts`, which runs on the server: that
  would pull the browser auth client into the server bundle to save two call
  sites. The smaller answer was also the only safe one.

## Browser verification — 2026-09-12, Chrome, local Compose stack

Counted rather than timed, per the feature's testing.md. `window.fetch` patched
to count `_serverFn` requests, signed in as marketpluscorp@gmail.com.

- **Five client navigations, one session RPC** — the first. Before this change
  each of the five would have made its own; the three measured for the research
  took 211 ms, 380 ms and 172 ms.
- **A full page load re-validates**: the article page renders from the server's
  own resolution, as it did before.
- **Signing out forgets it.** Logged out from the article page — which navigates
  to `/` through the router, not a reload — then went back to the article URL in
  the same document: landed on
  `/sign-in?returnTo=%2Flit-tracker%2F01a091cf-…`, not on an empty shell. Document
  continuity was checked separately (a marker set on one page survived a
  back/forward pair), so this is the cache being cleared and not a reload doing
  the work.
- **A signed-out visitor opening a tracker URL directly** is still redirected,
  `returnTo` intact including its search string.
- **Console:** one pre-existing `data-theme` hydration mismatch on the root
  document, present identically with the change stashed. Unrelated to this
  feature, and worth its own look later.

## Deviation from the written tests

`require-auth.test.ts` was not left untouched, as
[testing.md](./testing.md) expected: its cases share one jsdom document, so the
cache carries an answer from one to the next. `beforeEach` now calls
`forgetSession()` — the same call sign-out makes. The guard's assertions are
unchanged.

## Log

- 2026-09-12 — Filed with the feature.
- 2026-09-12 — Implemented, unit + browser verified, PR opened.
- 2026-09-12 — **Merged.** CI green: Biome/typecheck/unit, integration, PR
  title; both e2e tiers skipping while suspended.
