# Status: PDF Serving

**State:** **Implemented** — awaiting review. Second of five.

- Branch: `article-detail-and-reader/pdf-serving`, from `main` at `203c5fe`
  (task 1 merged).
- Sub-issue: [#97](https://github.com/nicbk/nicbk-website/issues/97), self-assigned
  before work started.
- PR: opened 2026-08-13, with the unit tier, the integration tier, and the
  browser pass all clean.

## Open items, settled before writing

- **The route's URL shape** — `/api/lit-tracker/articles/{articleId}/pdf`, the
  id as a path segment (user-decided 2026-08-13). It names the resource rather
  than the object behind it, and keeps the id out of query strings, which travel
  into logs and referrers. The one cost is cosmetic and was seen in the browser
  pass: Chrome titles the tab "pdf". A filename belongs in a
  `Content-Disposition` when some control asks for a download, which nothing
  decided does yet.
- **Which not-found response** — `404 {"error":"Not found."}` for *not yours*,
  *not there*, and *malformed*; `401 {"error":"Not signed in."}` for anonymous
  (user-decided 2026-08-13). The 401 is decided before the id is examined, so it
  is identical for a real id and an invented one and reveals nothing; it also
  leaves task 3 able to tell an expired session from a deleted article, which a
  blanket 404 would not.
- **Streaming through the framework** — confirmed, not assumed. TanStack Start
  server handlers return a web `Response`, whose body may be a `ReadableStream`;
  the S3 body's `transformToWebStream()` is `Readable.toWeb()` in Node, read from
  `@smithy/core`'s own source in `node_modules` rather than from documentation.
  So no buffered fallback was needed and none was written. `getArticlePdf` keeps
  buffering for the extraction pipeline, which holds the whole file either way to
  post it to GROBID; `openArticlePdf` is the streaming sibling, and the ownership
  check is shared rather than copied.

## What was built

- `src/lit-tracker/pdf/pdf-endpoint.ts` — the decision, as a plain
  `Request` → `Response` function, the shape `upload-endpoint.ts` and
  `query-endpoint.ts` already use.
- `src/routes/api/lit-tracker/articles/$articleId/pdf.ts` — the mount, GET only,
  resolving the session from the request's own cookie.
- `src/storage/pdf-storage.ts` — `openArticlePdf` beside `getArticlePdf`, both
  over one private `fetchOwnedObject` so the `isOwnedBy` check cannot be skipped
  by a second read path.

**One thing the spec did not anticipate:** the article id reaches a `uuid`
column, so a malformed segment made Postgres raise `22P02` — a 500 that a
well-formed unknown id never produces, and therefore a way to tell the two
apart. The id's shape is now checked before the query, and the case has tests in
both tiers.

## Verification

- **Unit** (`npm test`): 12 endpoint tests plus 3 mount tests plus 4 new storage
  tests. Notably, the database double is Drizzle's **pg-proxy driver** rather
  than the hand-rolled `{ select: () => ... }` used elsewhere: it builds the SQL
  a real pool would and hands over the parameters, so the assertion is that
  `user_id` is *in the statement* — the property this route lives on — rather
  than merely that a query happened.
- **Integration** (`npm run test:integration`, real Postgres + real Garage): 6
  tests, all passing. Byte-identical round trip; a 3 MB file arriving whole;
  another user's article refused **while genuinely present**, with the refusal
  asserted equal to the nonexistent id's response rather than merely "an error";
  anonymous requests indistinguishable for a real and an invented id; and a row
  whose object is missing failing with a 500 rather than an empty 200.
- **Coverage**: 91.84% lines against main's 91.70% baseline — up, not merely
  level.
- **Browser** (Compose app, rebuilt image, signed in):
  - Two of the four real papers opened at their URLs and rendered in Chrome's
    built-in viewer — "Attention Is All You Need" (15pp) and BERT (16pp), both
    complete and scrollable.
  - **No request to Garage in the network panel.** The tab made exactly two
    requests: the app-origin PDF, and Chrome's own viewer stylesheet. That is
    the observable form of the no-presigned-URL rule.
  - A well-formed id that does not exist, and a malformed one, both returned
    `{"error":"Not found."}` — the second being the case that would have been a
    500 without the shape check.
  - Signed out (`curl`), a real id and an invented one both returned the same
    `401 {"error":"Not signed in."}`.

## Log

- 2026-08-13 — Implemented. The three open items settled with the user first
  (URL shape, refusal responses), except streaming, which research settled on its
  own. Route, endpoint, and the streaming storage sibling built; the malformed-id
  hole found and closed; unit + integration + browser passes clean. No range
  requests and no caching beyond `private, no-store`, as the spec asks — if the
  reader in task 3 needs either, it brings that finding back here.
