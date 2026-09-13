# Plan: Tracker Navigation Latency

**One task**, gated by its own PR + CI + human review.

## Why one and not two

Because the change is one decision in one place: where `requireAuth` gets its
session. There is no seam that would leave a first PR independently useful — a
cache with nothing reading it is not a demoable half, and splitting the
invalidation from the cache would ship a known defect on purpose.

The feature is small on purpose. Its weight is in the measurement that justified
it and in the one constraint that could go badly wrong, not in the code.

## Task — [`session-resolved-once`](./tasks/session-resolved-once/description.md)

- A browser-only cache of the resolved session, seeded on first use and read by
  `requireAuth` thereafter.
- Cleared where sign-out and account deletion succeed, both of which are
  client-side and neither of which reloads the page.
- The guard's decision (`requireSession`) untouched.

**Delivers:** opening an article from the collection begins immediately instead
of after a round trip.

## Risks, named up front

- **A cache on the server would be a session leak.** One process serves every
  user; a module-level variable holding "the" session is a cross-user bug of the
  worst kind. This is the reason the task's constraints demand a test asserting
  the cache is unreachable on the server rather than a comment promising it. If
  the module boundary cannot be made to guarantee that, the fallback is to key
  the cache inside a browser-only entry point and raise the change of shape
  before taking it.
- **Sign-out is client-side, so the cache outlives it.** Both sign-out and
  account deletion navigate away without reloading. Missing either one ships a
  reader who can walk back into an empty shell.
- **The first navigation may still pay.** SSR resolves the session on the server,
  and whether that answer reaches the browser without a second ask depends on
  what TanStack Start serializes into the client. If it does not come free, the
  honest outcome is *at most one RPC per page load* rather than zero — which is
  what the acceptance criteria say, deliberately.
- **A measurement that cannot be taken locally.** The whole point is a round trip
  that costs ~15 ms of work and ~120 ms of waiting on the deployed host. The
  browser pass counts *round trips*, which is the thing that changed; the
  milliseconds are the user's to feel on `nicbk.com`.
