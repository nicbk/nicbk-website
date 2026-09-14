# Testing: A Paper Downloads Once

## Unit — `pdf-endpoint.test.ts`, `pdf-storage.test.ts`

Storage is stubbed in the route's tests, as today; the SDK client is stubbed in
the storage tests.

**Route**

- A 200 carries `private, no-cache` and the ETag storage reported.
- A matching tag → 304: no body, no `content-length`, ETag and `cache-control`
  present.
- **With a matching tag and no session → 401, storage not called.**
- **With a matching tag and another user's article → 404, storage not called**,
  and byte-identical to the not-there 404.
- A malformed `If-None-Match` is not forwarded; a `W/` tag is forwarded without
  the prefix.
- A missing object with a tag → the clean 500.
- The existing test named "…or cached publicly" is updated to the new policy, not
  deleted.

**Storage**

- `ifNoneMatch` reaches `GetObjectCommand`.
- The SDK's thrown 304 shape becomes the not-modified result, with the ETag.
- Any other thrown error still throws.

Check the security tests by moving the revalidation above the ownership check
and confirming they fail.

## Integration — `pdf.integration.test.ts` (Testcontainers Garage)

- A first read returns an ETag; a second read sending it gets **304** with no
  body. This is where Garage's real conditional behaviour is proven, rather than
  the stub's.
- A second read sending a different tag gets the whole paper.
- After the cleanup job deletes the object, a request with the old tag gets the
  refusal, not a 304.

## Browser

`fetch()` shows a revalidated response as a 200, so **status is not evidence**.
Read `PerformanceResourceTiming.transferSize` (a 304 is a few hundred bytes; a
body is megabytes) and compare timing against the first load.

| Check | Where |
|---|---|
| open a paper, leave, reopen: second transfer carries no body | Chrome, local Compose stack |
| the 13.4 MB paper specifically — the largest body WebKit is asked to keep | **Safari, `nicbk.com`, after deploy** |
| the response headers on `nicbk.com` carry the ETag unaltered through Caddy | Safari, `nicbk.com` |
| a paper still opens after reopen (the engine accepts the cached body) | both |

Use a window the agent created, and close it by its id.

## Not covered

**No e2e specs** — deferred project-wide. **Deletion in the browser** is proven by
the integration test rather than by deleting one of the user's articles; if a
browser check ever needs one, create it for the purpose and delete it by the id
recorded at creation.
