# Plan: A Paper Downloads Once

One task. The decision is made and the storage behaviour it relies on is
measured; what remains is a small change to one route and the function beneath
it.

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`unchanged-papers-answer-304`](./tasks/unchanged-papers-answer-304/description.md) | [#181](https://github.com/nicbk/nicbk-website/issues/181) | ETag + `private, no-cache` on the PDF route, and a 304 for an unchanged paper |

## Shape of the work

**Storage.** `openArticlePdf` takes an optional `ifNoneMatch`, passes it to
`GetObject`, and returns either the stream with its ETag and length, or a
distinct "not modified" result carrying the ETag — translating the SDK's thrown
304 into a value, so no caller has to know the SDK does that.

**Route.** Reads and validates `If-None-Match`, hands it down after the
ownership checks, and answers 200 or 304 with the headers in
[constraints-and-behavior.md](./constraints-and-behavior.md). The comment on
`cache-control` is rewritten: it currently records a non-decision, and it must
now record the decision and why `immutable` was not it.

**Docs.** The security research gains a line: PDFs are now held in the browser's
private cache, served only after revalidation.

## Risks, and what makes each survivable

- **The SDK's thrown 304 becomes a 500.** Unit test with the storage stub
  throwing the SDK's shape, and an integration test against real Garage.
- **A 304 before authorization.** Unit tests send a matching tag with no session
  and with another user's id, and assert storage was never called.
- **WebKit does not cache the large body.** Possible, and unknowable from here
  until it runs. If Safari re-downloads, the finding comes back before anything
  else is tried — the next step would be a decision, not a patch.
- **Caddy on the host rewrites the ETag** (for example by compressing). Observed
  not to touch `cache-control`, but ETags are unobserved until deploy; the Safari
  check on `nicbk.com` covers it.

## Dependencies

Depends on **#7** (storage, upload keys) and **#9** (the PDF route and reader).
Nothing depends on it.
