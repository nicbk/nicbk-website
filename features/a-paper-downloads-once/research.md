# Research: A Paper Downloads Once

Everything here was measured on 2026-09-14 before the spec was written.

## 1. The report reproduces, and the cause is one header

Three papers fetched twice each from a signed-in page on `nicbk.com`, with
`fetch()` — the call EmbedPDF's default fetcher makes
(`@embedpdf/engines` `pdf-engine-*.js`: `(url, init) => fetch(url, init)`, then
`arrayBuffer()`). Both passes of every paper returned the full
`content-length`, and the headers on all six were:

```
cache-control: private, no-store
content-length: <full size>
via: 1.1 Caddy
```

No `etag`, `last-modified`, `accept-ranges` or `vary`. `via: 1.1 Caddy` with the
app's own `cache-control` intact shows the proxy neither adds nor strips caching
headers — though the host's Caddyfile is outside this repository, so that is
observed, not read.

## 2. A paper's bytes do not change under its URL

- The object key is `lit-tracker/{userId}/{articleId}/source.pdf`
  (`src/storage/object-key.ts`), and every upload gets a fresh `uuidv7()` article
  id (`src/lit-tracker/upload/store-upload.ts`).
- `putArticlePdf` is the only writer and is called only from the upload path.
  Article edit is barred from touching `pdf_object_key`
  (`features/article-edit/constraints-and-behavior.md`).
- Deletion removes the row, then a job deletes the object; the URL then 404s.

So a cached copy can only go stale by the article ceasing to exist — which the
route already reports on every request under the decided policy.

**The ETag is Garage's, not the article id**, even though the id would work
today: the object's own tag changes if its bytes ever do, so a later
replace-PDF feature cannot make a cached copy silently wrong.

## 3. Garage answers conditional reads itself

Probed from the app container against the local Compose Garage:

| request | result |
|---|---|
| `HeadObject` | `ETag: "18e1b0…da25"` (32 hex, quoted) |
| `GetObject` | same ETag |
| `GetObject` + `If-None-Match: <that tag>` | **304** |
| `GetObject` + `If-None-Match: "nope"` | 200 |
| `GetObject` + `If-Modified-Since: <LastModified>` | 304 |

**The AWS SDK throws on the 304** rather than returning it: `name: 'Unknown'`,
`$metadata.httpStatusCode: 304`. Anything that catches storage errors generally
— as the route does, to answer a clean 500 — will turn "unchanged" into a failure
unless it recognises this case first.

Production runs Garage on the host; the same behaviour there is checked after
deploy rather than assumed.

## 4. The three policies, and the decision

| | per-read auth | reopen cost | deleted / signed out |
|---|---|---|---|
| **`private, no-cache` + ETag** | **yes** | one request, 304, no body | refused on next open |
| `private, max-age=1y, immutable` | no | nothing | still opens from disk |
| app-managed Cache API / IndexedDB | app's choice | nothing | app must evict |

The security decision
(`research/security-privacy/pdf-and-annotation-data-protection.md`) says the app
server "authenticates the request and checks `user_id` ownership before
streaming the object". Only the first row keeps that true for every open.
**Decided with the user, 2026-09-14: revalidate.**

## 5. Consequences accepted with that choice

- **A copy now lives in the browser's disk cache.** Under `no-store` it did not.
  It is `private`, so no shared cache may keep it, and it is only *served* after
  the server says so — but the bytes are on the device. Signing out does not
  remove them. `Clear-Site-Data: "cache"` on sign-out would; its support in
  Safari has not been checked, and it is out of scope here.
- **A different user of the same browser profile cannot use it.** Their
  revalidation goes through the ownership check and gets 404, which replaces the
  cached entry.
- **JavaScript cannot see the 304.** A revalidated response is presented to
  `fetch()` as the stored 200. Browser verification has to read transfer size or
  timing, not `response.status`.
- **Whether WebKit's cache keeps a 13 MB body at all** is unmeasured. It is the
  first thing the Safari check answers.
