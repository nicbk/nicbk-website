# Task: Unchanged Papers Answer 304

Task 1 of 1 of [#21 `a-paper-downloads-once`](../../description.md). Sub-issue
[#181](https://github.com/nicbk/nicbk-website/issues/181).

## What it does

The PDF route sends Garage's `ETag` with `cache-control: private, no-cache`, and
answers a request whose `If-None-Match` still matches with **304 and no body** —
after the session and ownership checks, exactly where a 200 would be answered
today.

## Files

- `src/storage/pdf-storage.ts` — `openArticlePdf` accepts `ifNoneMatch`, returns
  the ETag, and turns the SDK's thrown 304 into a not-modified result.
- `src/lit-tracker/pdf/pdf-endpoint.ts` — validates `If-None-Match`, passes it
  down, answers 200 or 304; the `cache-control` comment records the decision.
- Tests beside both, and `pdf.integration.test.ts`.
- `research/security-privacy/pdf-and-annotation-data-protection.md` — one line on
  the browser's private cache.

## What it does not do

No client code, no range requests, no `immutable`, no `Clear-Site-Data`. See the
feature's [description](../../description.md).
