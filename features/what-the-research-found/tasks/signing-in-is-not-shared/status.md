# Status: Signing In Is Not Shared

**State:** Merged ([#263](https://github.com/nicbk/nicbk-website/issues/263); PR [#265](https://github.com/nicbk/nicbk-website/pull/265)).

## What shipped

`createAuth` sets `advanced.ipAddress.disableIpTracking`. The comment gives the
reason (every visitor reaches the server as the relay's address) and the way
back (real client addresses, H2, then `trustedProxies`).

## Verification (2026-10-17)

- **The mechanism, against the installed Better Auth 1.6.25 in production
  mode.** Six `POST /api/auth/sign-in/social` requests with
  `x-forwarded-for: 10.100.0.1`, the relay's address:

  | IP tracking | statuses |
  |---|---|
  | on (before) | 200 200 200 **429 429 429** |
  | off (now) | 200 200 200 200 200 200 |

  The fourth person to start signing in within ten seconds was refused,
  whoever they were.
- **Unit:** `create-auth.test.ts` asserts the setting.
- **Integration:** `auth.integration.test.ts`, the sign-in round trip against
  real Postgres, passes.
- **Nothing in the app reads a session's `ipAddress`** (searched).

## Log

- 2026-10-18: merged.
- 2026-10-17: implemented and verified.
- 2026-10-17: spec'd.
