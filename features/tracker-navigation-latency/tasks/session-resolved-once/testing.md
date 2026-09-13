# Testing: Session Resolved Once

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest, jsdom)

- **Two calls, one resolution** — the behaviour being bought.
- **Concurrent calls share one resolution**, so a burst does not become a burst
  of requests.
- **With no `window`, two calls make two resolutions.** The security constraint
  asserted rather than commented: a server bundle importing this must behave
  exactly as it does today.
- **After clearing, the next call resolves again.**
- **A rejected resolution is not cached** as though it were an answer — the next
  call tries again rather than remembering a failure forever.
- `require-auth.test.ts` passes untouched; `requireSession` is not modified.

## Integration

Nothing new.

## Browser verification (record in status.md — primary evidence)

**Counted, not timed** — see the feature's testing.md for why.

- Collection → article → collection → article makes **zero** session
  `_serverFn` requests after the first of the page load. Today: one each,
  measured at 211 ms, 380 ms and 172 ms.
- A reload re-validates: one request, and the page renders.
- Signing out inside the tracker, then navigating back to `/lit-tracker`, lands
  on `/sign-in` — not on a shell with no data.
- A signed-out visitor opening a tracker URL directly is still redirected with
  `returnTo` intact.
- Console clean.

## Coverage

Ratchet applies. The cache is small and entirely testable, so it should carry
its own weight rather than lean on the reader's suite.
