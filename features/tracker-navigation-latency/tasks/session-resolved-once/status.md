# Status: Session Resolved Once

**State:** Not started. The feature's only task.

- Branch: `tracker-navigation-latency/session-resolved-once`, from `main` at
  `72c4abd` or later.
- Sub-issue: [**#136**](https://github.com/nicbk/nicbk-website/issues/136).
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, check the feature's parent issue** — as of 2026-09-11 GitHub
  closes a parent when its last sub-issue closes, so closing by hand is the
  fallback rather than the expectation
  ([issue-and-pr-lifecycle.md](../../../../research/project-management-conventions/issue-and-pr-lifecycle.md)).

## Why this task exists

Measured on 2026-09-12: every client-side navigation inside `/lit-tracker`
blocks on one session RPC — 211 ms, 380 ms and 172 ms locally, with no network
at all — while the server-side work behind it costs 8–19 ms. On the deployed
host that trip is about one RTT, ~110–130 ms, in front of every move.

## Open items to settle while writing

- **Whether the first client navigation can be free too.** SSR resolves the
  session on the server; whether that answer reaches the browser without a
  second ask depends on what TanStack Start serializes into the client. The
  acceptance criteria promise *at most one per page load* precisely because this
  is unknown until tried — if it comes free, say so; if not, say that.
- **Where the clearing call belongs.** At each success site (`signOut`,
  `deleteUser`) is the plan; the alternative is for the cache to subscribe to
  Better Auth's own store, which is fewer call sites and one more dependency
  between modules. The smaller answer wins if both work.

## Log

- 2026-09-12 — Filed with the feature.
