# Constraints and Behavior: PDF Serving

The subset of
[the feature's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies.

## The route

- Serves **one article's PDF**, identified by the article id, to the user who
  owns it.
- **Requires a session.** An anonymous request never reaches Garage.
- **Checks ownership against the article row**, not against the object key
  alone. `isOwnedBy` is a defense in depth, not the authorization.
- Responds with **`application/pdf`**.
- **Streams the body** rather than buffering the whole file in memory.

## The security properties

These are the reason this task exists on its own, and each is a test, not a
code-review observation:

- **No presigned or signed Garage URL is issued to a client, ever.** Every read
  proxies through this server.
- A request for **another user's article** and a request for an **article that
  does not exist** produce the **same response** — same status, same body.
  Ownership must not be discoverable through a status code, a timing-obvious
  difference, or an error string.
- An **anonymous** request produces that same response, or the app's standard
  unauthenticated handling, but in no case reveals whether the id is real.
- An article whose **object is missing from the bucket** fails cleanly — no
  partial body, no 200 with zero bytes, no unhandled rejection taking the
  request down.
- The response continues to sit under the app's existing security-header
  posture
  ([app-security-headers.md](../../../../research/security-privacy/app-security-headers.md)).
  The route must not opt out of it, and must not invite the browser to treat the
  body as anything other than a PDF.

## Explicitly not in this task

- **No viewer and no EmbedPDF dependency.** Task 3.
- **No visible download control.**
- **No range/partial-content support** unless task 3 shows the reader requires
  it.
- **No shared-cache headers.** A per-user private document is not handed to a
  cache without a decision to do so.

## Cross-cutting

- CI green: Biome, typecheck, unit + integration with ratchet coverage,
  PR-title lint.
- Behaves identically under `npm run dev`, the production Nitro server, and
  `docker compose up` — the last of these being the one that talks to the real
  Garage container.
