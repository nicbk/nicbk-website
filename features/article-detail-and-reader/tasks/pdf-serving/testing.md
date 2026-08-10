# Testing: PDF Serving

What this task's tests must cover. The feature-wide tiers are in
[../../testing.md](../../testing.md).

This task's tests **are** its deliverable's justification. Everything it does is
either an authorization decision or a stream, and the authorization decisions
are the reason it is not folded into task 3.

## Unit (Vitest)

With the storage module and the session mocked:

- An **anonymous** request does not call into storage at all.
- A request for an article the session user **does not own** does not call into
  storage.
- A request for an article that **does not exist** does not call into storage.
- The **owner's** request calls `getArticlePdf` with the key from the article
  row — not a key derived from the URL.
- The response sets **`application/pdf`**.
- A storage error surfaces as a clean failure rather than an unhandled
  rejection.

## Integration (Vitest + Testcontainers Postgres + Garage)

The security core, against real containers — Garage is already in the
integration setup from #7's storage work:

- **Owner gets the bytes.** A PDF put through the existing upload path comes
  back byte-identical, with the right content type.
- **A different user gets the not-found response** — and it is **identical** to
  the response for a nonexistent id. Assert equality of status and body between
  the two cases, not merely that each is "an error"; that equality is the
  property, and asserting them separately would pass even if one were a 403.
- **An anonymous request** reveals nothing about whether the id is real.
- **A missing object** (row present, bucket empty) fails cleanly: no 200, no
  partial body.
- Non-vacuity: the other user's article and PDF are **genuinely present**, so a
  handler that could never serve anything would still fail these.

## Browser verification (record in status.md)

- Open the route for one of your own articles and see the paper render in
  Chrome's built-in viewer.
- Open the route for an id that does not exist and confirm what comes back.
- Confirm the file is served through the app origin — **no request to the
  Garage endpoint appears in the network panel**, which is the observable form
  of the no-presigned-URL rule.

## Coverage

Ratchet applies. A route handler with mocked dependencies is fully coverable;
there is no reason for a drop here.
