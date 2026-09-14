# Constraints and Behavior: A Paper Downloads Once

## Behavior

**A paper the browser already has is not downloaded again.** Opening it sends
one request; if the paper is unchanged and still the requester's, the answer is
304 with no body and the reader opens from the browser's copy.

**Every refusal is exactly as it was.** No session: 401. Not yours, not there, or
a malformed id: the same 404. Row present but object missing: the clean 500.
None of these changes because the request carried `If-None-Match`.

## Constraints

### Authorization before revalidation, always

The route's order is its security property — no session means no query, no row
means no call into storage — and a 304 is a successful read. It is reachable only
at the point a 200 is reachable today. A request with a matching tag and no
session is a 401; with another user's article, a 404.

### The storage call decides "unchanged"

Forward the browser's `If-None-Match` to Garage's `GetObject` and let Garage
compare. Do not add a `HeadObject` round trip, and do not compare against a value
the route computed itself.

- **Forward only a well-formed header**: a comma-separated list of entity tags
  (`"…"`, optionally `W/`-prefixed, or `*`), bounded in length. Anything else is
  ignored and the request is an ordinary full read — never an error.
- `If-None-Match` uses weak comparison, so a `W/` prefix is stripped before
  forwarding.

### The SDK's 304 is not an error

The AWS SDK throws on a 304 response. Recognise that specific case —
`$metadata.httpStatusCode === 304` — **before** the route's general catch, which
must keep turning real storage failures into the clean 500.

### Headers

| | 200 | 304 |
|---|---|---|
| `cache-control` | `private, no-cache` | `private, no-cache` |
| `etag` | Garage's, verbatim | Garage's, verbatim |
| `content-type` | `application/pdf` | — |
| `x-content-type-options` | `nosniff` | `nosniff` |
| `content-disposition` | `inline` | — |
| `content-length` | when known | **never** |
| body | the stream | **none** |

`private` stays: this is one user's document, and no shared cache is invited to
keep it. Error responses are unchanged.

### Scope

One route and the storage function beneath it. No client code: EmbedPDF's
default fetcher already uses the browser's HTTP cache. No range support, no
service worker, no `Clear-Site-Data`.

## Acceptance criteria

1. A 200 carries `cache-control: private, no-cache` and Garage's `ETag`.
2. A request whose `If-None-Match` matches the object gets **304**, no body, no
   `content-length`, with the same `ETag` and `cache-control`.
3. A non-matching or malformed `If-None-Match` gets an ordinary 200 with the
   whole paper.
4. With a matching tag: no session → 401; another user's article → 404; no such
   article → 404. Storage is not reached in any of them.
5. A missing object still answers the clean 500, with or without a tag.
6. Against a real Garage container, a second request with the first response's
   `ETag` gets 304.
7. In the browser — Chrome locally, and **Safari on `nicbk.com` after deploy** —
   reopening a paper transfers no PDF body, and a deleted article is refused on
   the next open.
