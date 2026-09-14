# Status: Unchanged Papers Answer 304

**State:** **Implemented**, in review. Task 1 of 1.

- Branch: `a-paper-downloads-once/unchanged-papers-answer-304`, from `main` at
  `7cd69f9` with the feature spec merged.
- Sub-issue: [**#181**](https://github.com/nicbk/nicbk-website/issues/181).
- **On merge this does not complete #21** — the Safari check on `nicbk.com`
  after deploy does. Then check the parent
  [#180](https://github.com/nicbk/nicbk-website/issues/180) and close it by hand.

## What shipped

- **`if-none-match.ts`** — a pure gate from the request header to the condition
  Garage receives: a bounded list of entity tags or `*`, weak prefixes stripped,
  anything malformed dropped to "no condition" rather than refused.
- **`openArticlePdf`** takes `ifNoneMatch`, returns the object's `etag`, and
  returns `{ kind: 'not-modified' }` for Garage's 304 — after the ownership
  check, which still runs first.
- **The route** sends `private, no-cache` and the ETag on every PDF, and a 304
  with no body, type, disposition or length when the paper is unchanged. The old
  `no-store` comment, which recorded a non-decision, is replaced by the decision.
- **The security decision** gains a bullet recording the policy and its accepted
  consequence.

## Measured while implementing

A second probe against Garage, before writing the storage change:

| `If-None-Match` sent | Garage |
|---|---|
| the object's tag | 304 |
| a list containing it | 304 |
| `*` | 304 |
| the tag, unquoted | 304 |
| **`W/` + the tag** | **200 — the whole object** |

- **The weak row is why the prefix is stripped.** RFC 9110 compares
  `If-None-Match` weakly; Garage does not, so a weakened tag — which a
  compressing proxy produces — would never revalidate.
- **The ETag is on the thrown 304**, on a non-enumerable `$response.headers`, so
  the 304 carries the tag without a second request.
- One test was wrong, not the code: it expected a trailing comma to void the
  header. RFC 9110 §5.6.1 has recipients ignore empty list elements; the test now
  says so.

## Verification

- **Unit:** 1676 pass (1643 + 33). Typecheck clean; Biome clean at warning level.
- **Integration**, against real Garage: 16 pass, including a second read with
  the first read's tag → 304, a `W/` copy → 304, another user's real tag → 404,
  and a deleted object with its old tag → the clean 500, not a 304.
- **Each security-relevant test was checked by breaking the code:**

| Mutation | Caught by |
|---|---|
| revalidate before the session and ownership checks | 5 unit tests, including anonymous → 401 and not-yours → 404 |
| treat the SDK's 304 as an ordinary failure | storage unit test; 2 integration tests |
| drop the condition from `GetObjectCommand` | storage unit test; 2 integration tests |

### Chrome, local Compose stack

The user reconnected the extension after the PR opened.

| Check | Result |
|---|---|
| the served build is this branch | 200 carries `private, no-cache` and `ETag: "18e1b0…da25"`; the same tag sent by hand → **304**, empty body, no length |
| open the paper in the reader, go back, open it again | every PDF request after the first: **`transferSize` 300 bytes**, `decodedBodySize` 2,215,244 — served from the browser's copy |
| the paper renders from the revalidated copy | yes, both opens |

### Found on the way: two PDF requests per open, in development only

Each open issued **two** requests 1–2ms apart. Stacks put both in EmbedPDF's
`PluginRegistry.initialize`, run from the provider's `useEffect` on
`[engine, plugins]` — and a temporary probe (removed, not committed) showed
`mount → unmount → mount` of the **same** component instance within 1ms, with one
engine. That is React StrictMode's double effect, which TanStack Start's default
client entry turns on (`react-start/dist/plugin/default-entry/client.tsx`). It
does not run in a production build, so it is not a defect here — but on a cold
cache in development both requests download the whole paper, since neither has
finished when the other starts. **The production count is checked on
`nicbk.com`** alongside the Safari check.

## Not verified

- **Safari, and production.** Whether WebKit keeps the 13.4 MB paper, whether
  Caddy on the host passes the ETag through untouched, and that production opens
  a paper with one request. All three are the feature's definition of done, on
  `nicbk.com` after deploy.

## Log

- 2026-09-14 — Chrome check run: reopening transfers 300 bytes. Traced the
  doubled request to StrictMode, development only.
- 2026-09-14 — Implemented. 1676 unit and 16 integration tests pass; three
  mutations each caught.
- 2026-09-14 — Spec'd.
