# Status: GPG Key Publishing

**State:** Not started (2026-07-06).

- Branch: _not yet created_ (`about-page/gpg-key-publishing` when started).
- Sub-issue: [#18](https://github.com/nicbk/nicbk-website/issues/18)
  (parent [#17](https://github.com/nicbk/nicbk-website/issues/17)); unassigned
  — claim by self-assign before starting.
- PR / CI / review: _pending._

## Preconditions in place

- `public/pgp/nicbk.asc` committed (source of truth); WKD hash for
  `nicolas@nicbk.com` confirmed `egg3eb1dsgmi4atdj5obrtipjpcjyocr`;
  fingerprint `F835BB53D8D44AAC92F5C1F6B7BB84802180025E`.
- Generator will target the `gpg` CLI (present in dev + GitHub CI); no `gpg`
  or `openpgp.js` dependency added to the shipped image (artifacts committed).

## Known issue to carry

The source key is **expired** (2024-04-18). This task publishes it as-is per
user decision; it must not hard-fail on expiry. A renewed key later is a
drop-in `.asc` swap + regenerate.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started.
