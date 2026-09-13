# Research: Tracker Navigation Latency

Traceability back into `research/*.md`, plus the measurements this feature was
spec'd from. Everything below was measured on **2026-09-12** against `main` at
`72c4abd`.

## Decided research this builds on

- [authentication-and-session-management.md](../../research/security-privacy/authentication-and-session-management.md)
  — Better Auth, the session cookie, and where a session may be read. This
  feature changes *how often* the browser asks, not what an answer means.
- [app-security-headers.md](../../research/security-privacy/app-security-headers.md)
  and
  [pdf-and-annotation-data-protection.md](../../research/security-privacy/pdf-and-annotation-data-protection.md)
  — the decided rule that every read of user data is authorized server-side from
  the request's own cookie. That rule is what makes caching the *guard's* answer
  a latency decision rather than a security one.
- [routing-and-navigation.md](../../research/system-architecture/routing-and-navigation.md)
  — the route-group layout the guard is attached to, and why it is attached
  there rather than per page.

## What was measured

**The mechanism.** `/lit-tracker`'s `beforeLoad` awaits `requireAuth`, which
awaits `fetchSession()` — a TanStack **server function**
(`src/auth/fetch-session.ts`). On the initial request its handler runs in
process. On every client-side navigation it is an RPC: the browser posts to
`/_serverFn/…`, the app server validates the cookie against Postgres, and the
answer comes back before the destination route may begin.

**How often.** Every navigation, measured by clicking through the running app
and counting `_serverFn` requests:

| Navigation | Blocking RPCs | Local |
|---|---|---|
| collection → article | 1 | 211 ms |
| article → collection | 1 | 380 ms |
| collection → article again | 1 | 172 ms |

Same cookie, seconds apart, re-validated each time.

**Where the time goes — and this is the finding.** Asking the server directly
for the same answer, warm:

```
/api/auth/get-session  →  8–19 ms
```

So the validation costs ~15 ms and the browser waits ~200 ms. **The cost is the
trip, not the work.**

**What the trip costs on the deployed host.** `curl https://nicbk.com/`, five
times: TCP connect **~100 ms**, first byte 300–830 ms cold. On a warm HTTP/2
connection the guard's RPC is therefore about **one RTT plus ~15 ms — call it
110–130 ms — in front of every navigation**, from this measuring location.

The local numbers are a lower bound with no network at all, which is why the
deployed host was measured too: the question was never "how many milliseconds"
but "what is the blocking round trip", and there is exactly one.

## Why caching this is safe

**The guard is UX gating.** It decides whether to render the tracker or redirect
to `/sign-in`. It is not what protects anything, and this was checked in the
code rather than assumed — every path that serves user data resolves the session
itself, server-side, from the request's own cookie:

- the PDF proxy: `getSession(incoming)`
  (`src/routes/api/lit-tracker/articles/$articleId/pdf.ts`);
- the mutate endpoint: `getSession(request)` (`src/zero/mutate-endpoint.ts`);
- every Zero read, through `ownership.ts` / `queries.ts`, which
  `ownership.ts` itself calls "the read half of this site's authorization
  boundary".

So the worst a stale "signed in" belief can do is render an empty shell whose
data requests are then refused. That is a cosmetic failure, and a reload fixes
it.

## What else the reading turned up

**The browser already holds a session, by a second mechanism.** Better Auth's
own client (`authClient.useSession()`) maintains session state in the page, and
is live today — `annotation-sync/use-annotation-sync.ts` reads it for the mark's
author. So the application asks "who is this?" twice, by two different routes,
and only one of them blocks navigation.

Reading that store from the guard instead was weighed and **not** taken: the
guard runs in `beforeLoad`, which is not a component, so the hook is unavailable
there, and the store's own resolution would have to be proved not to be the same
round trip wearing a different hat. Recorded because it is the structurally
tidier answer if this is ever revisited — one session source in the browser
rather than two.

## The decision, taken with the user on 2026-09-12

**Resolve once per page load.** The first client-side navigation of a document
pays one RPC; every navigation after it reads the answer from memory; a reload
re-validates. Weighed against:

- **a short TTL** — bounds how long a revoked session keeps the shell visible,
  at the cost of a periodic slow navigation and a number nobody can feel is
  right without the deployed host to try it on;
- **optimistic render with background revalidation** — always fast and
  eventually fresh, but a late redirect is a UI jump mid-read, and it is the
  most machinery of the four;
- **reading Better Auth's client store** — above.

The freshness this gives up is stated plainly rather than hidden: a session that
expires or is revoked elsewhere keeps showing the tracker's shell until the next
full page load. Its data does not come with it.
