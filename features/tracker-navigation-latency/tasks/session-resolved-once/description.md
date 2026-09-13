# Task: Session Resolved Once

**The feature's only task.** The browser resolves the session once per page load
and reads the answer thereafter.

## What it does

- **Caches the resolved session in the browser**, seeded the first time
  `requireAuth` needs it and read by every navigation after.
- **Clears it where sign-out and account deletion succeed** — both are
  client-side and neither reloads the page, so nothing else would.
- **Leaves the guard's decision alone.** `requireSession` still hands back a
  session or throws the redirect to `/sign-in` with the destination intact.

## What it does not do

- **No cache on the server.** One process serves every user; the module must be
  unreachable there, asserted by a test rather than promised by a comment.
- **No TTL.** One document's lifetime, cleared on sign-out. A duration would be
  a guess, and the guess is exactly what the decision declined.
- **No new authorization.** Nothing starts trusting the cached session for
  access — every data path keeps resolving its own, server-side.

## Exit state

Clicking from the collection into an article, back, and into another makes no
session round trips at all after the first of the page load — against one per
navigation today.
