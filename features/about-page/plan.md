# Plan: About Page

## Approach

Deliver the key-publishing plumbing first, then the page that consumes it.
The mockup's Fingerprint/Public Key block is not free-typed text — the
displayed fingerprint is **derived from the real key** and the "Public Key"
link points at a **real served `.asc`** (see
[research/security-privacy/gpg-key-publishing.md](../../research/security-privacy/gpg-key-publishing.md)).
So the key artifacts (WKD files, `.asc`, derived-fingerprint constant) must
exist before the page can render honestly against them; otherwise the page
would hard-code a fingerprint, which is exactly the drift the research
forbids.

Generated artifacts are **committed**, not built on every deploy: the
committed `.asc` is the source of truth, a generator script emits the WKD
files and fingerprint constant from it, and CI re-runs the generator and
fails on any diff (drift check). This keeps the production/Docker build free
of a `gpg` dependency while still guaranteeing the served artifacts match the
source key.

## Task breakdown and sequence

Tasks are sequential — one open at a time, each merged behind its own
PR + CI + human review before the next begins.

1. **[`gpg-key-publishing`](./tasks/gpg-key-publishing/description.md)**
   — Introduce `public/` static-asset serving. Add
   `scripts/gen-gpg-artifacts.mjs`, which reads `public/pgp/nicbk.asc` and
   emits (all committed): the WKD binary key at
   `public/.well-known/openpgpkey/hu/<wkd-hash>`, the WKD `policy` file, and
   the derived fingerprint constant module. Add a CI drift-check step that
   re-runs the generator and fails on any diff. Exit state: WKD resolves the
   key (`gpg --locate-keys nicolas@nicbk.com` against the app), the `.asc`
   downloads, and the fingerprint constant matches the key — no page yet.

2. **[`about-page-content`](./tasks/about-page-content/description.md)**
   — Replace the `/about` placeholder with the real page component, matching
   `about-page.png`: heading, Résumé/CV (`/nicbk_cv.pdf`) + LinkedIn links,
   the Communication section (consuming task 1's fingerprint constant and
   linking `/pgp/nicbk.asc`), and the Version Control section. Follows the
   established home-page component pattern (colocated `-components/about-page/`
   with CSS-Module styling from design tokens). Exit state: `/about` matches
   the mockup in both themes.

## Sequencing rationale

- Key publishing first so the page consumes a **derived** fingerprint and a
  **real** `.asc`, never a hand-typed literal — the research's core
  anti-drift constraint. It is also independently verifiable (a WKD lookup)
  without any page existing.
- The page last: it is pure static presentation once its one dynamic input
  (the fingerprint constant) exists, and it reuses the shell/header/tokens
  already shipped by `app-shell-and-home`.
