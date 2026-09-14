# Feature: A Paper Downloads Once

**#21** in [../index.md](../index.md). Reopening a paper downloads the whole PDF
again.

## What it is

Every time the reader mounts — opening an article, coming back to it, switching
to another and back — it fetches the entire PDF. Measured on `nicbk.com`,
2026-09-14, the same PDF requested twice in a row:

| paper | size | first | second |
|---|---|---|---|
| The Elements of Statistical Learning | 13.4 MB | 953 ms | **13.4 MB again**, 524 ms |
| Discover, Explain, Improve | 2.9 MB | 162 ms | **2.9 MB again**, 173 ms |
| A Neural Probabilistic Language Model | 0.14 MB | 105 ms | **0.14 MB again**, 111 ms |

Those timings are from a fast link to the host. On a phone, the cost is the
13 MB, every visit.

## The cause

The route answers `cache-control: private, no-store`, with no `ETag` and no
`Last-Modified` — so the browser is forbidden to keep a copy, and could not ask
whether one is current if it had one. Caddy passes the header through unchanged.

`no-store` was never a decision about PDFs. Its own comment says it was chosen
"because nothing has decided that PDFs should be cached at all; if the reader
turns out to want it, that is a decision to make then." This feature is that
decision.

## What it delivers

- **A reopened paper transfers no PDF bytes.** The route sends the object's
  `ETag` with `private, no-cache`; the browser keeps its copy and asks on every
  open; an unchanged paper answers **304, no body**.
- **Authorization on every read, as before.** The revalidation request goes
  through the same session and ownership checks as a full read, in the same
  order — a 304 is only reachable after both.
- **No storage read for a 304.** The browser's `If-None-Match` is forwarded to
  Garage, which answers 304 itself.

## What it does not do

- **It does not skip the request.** `immutable` would make a reopen instant and
  offline, but a deleted article or a signed-out session would still open from
  disk. Decided with the user: keep the per-read check. See
  [research.md](./research.md).
- **No client-side store** — no Cache API, IndexedDB or service worker. The
  browser's HTTP cache does this job, with no code to evict or quota to manage.
- **No range requests.** The engine reads the whole body with `arrayBuffer()`
  regardless (already recorded in #9's reader task), so a partial response would
  buy nothing.
- **Not the reading position** (item 4 of the same list) — separate feature.

## Exit state

Opening a paper you have opened before costs one small request and no download,
and deleting an article or signing out still takes effect on the very next open.
