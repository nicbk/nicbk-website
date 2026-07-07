# Status: GPG Key Publishing

**State:** Implemented, in review (2026-07-07). All local gates green
(Biome, typecheck, 50 unit tests, 21 e2e against the production build), plus
the generator determinism, drift-check, and end-to-end WKD-import checks
below.

- Branch: `about-page/gpg-key-publishing`.
- Sub-issue: [#18](https://github.com/nicbk/nicbk-website/issues/18)
  (parent [#17](https://github.com/nicbk/nicbk-website/issues/17)); self-assigned.
- PR / CI / review: [#34](https://github.com/nicbk/nicbk-website/pull/34)
  open; awaiting CI + human review.

## Preconditions in place

- `public/pgp/nicbk.asc` committed (source of truth); WKD hash for
  `nicolas@nicbk.com` confirmed `egg3eb1dsgmi4atdj5obrtipjpcjyocr`;
  fingerprint `F835BB53D8D44AAC92F5C1F6B7BB84802180025E`.
- Generator targets the `gpg` CLI (present in dev + GitHub CI); no `gpg` or
  `openpgp.js` dependency added to the shipped image (artifacts committed).

## Known issue to carry

The source key is **expired** (2024-04-18). Published as-is per user decision;
the generator does not hard-fail on expiry. A renewed key later is a drop-in
`.asc` swap + regenerate (procedure documented in the generator header).

## Verification performed (this session)

- **Determinism:** running `scripts/gen-gpg-artifacts.mjs` twice on the
  unchanged `.asc` yields byte-identical WKD key, policy, and fingerprint
  module (all gpg work done in a throwaway keyring).
- **Correctness against the source key:** the generator's own round-trip
  self-check re-imports the exported WKD key and asserts it matches the source
  fingerprint; additionally, the key **as served over HTTP** was downloaded,
  imported into a fresh keyring, and resolved to
  `F835BB53D8D44AAC92F5C1F6B7BB84802180025E` — the closest local approximation
  of a mail client's WKD discovery (a real domain WKD lookup is a post-deploy
  step; the domain does not serve this yet and the key is expired).
- **Drift check:** re-running the generator against the committed `.asc`
  leaves a clean `git diff --exit-code`; a deliberately hand-edited (stale)
  fingerprint was confirmed to make the check fail. Wired as a CI step in the
  `checks` job (ubuntu-latest ships gpg).
- **Serving parity dev vs prod:** all three paths return 200 under both
  `npm run dev` and the production `node .output/server/index.mjs`.

## Log

- 2026-07-06 — Task defined during feature spec. Not yet started; follows
  `site-shell-and-not-found`.
- 2026-07-07 — Implemented. Added `scripts/gen-gpg-artifacts.mjs`, the single
  regeneration entry point: it reads `public/pgp/nicbk.asc` in a throwaway
  keyring and emits three **committed** artifacts — the binary WKD key at
  `public/.well-known/openpgpkey/hu/<wkd-hash>`, the empty
  `public/.well-known/openpgpkey/policy`, and the derived
  `src/gpg/fingerprint.generated.ts` constant. The WKD hash is **derived**
  from the key's own email (z-base-32 SHA-1 of the local part) rather than
  hardcoded, so a rotation to a different address needs no code change. Added
  a CI drift-check step (`git diff --exit-code` after regeneration) enforcing
  "derive, don't hand-type"; unit tests for the pure helpers
  (`zbase32`/`wkdLocalPartHash`, cross-checked against `gpg-wks-client`) and
  the generated constant's shape; and an e2e spec asserting the three paths
  serve over the production build.
- 2026-07-07 — **Discovered** the dev server (Vite's sirv static middleware)
  404s dotfile paths, so `/.well-known/*` was unserved under `npm run dev`
  even though the production Nitro server serves it — violating the "identical
  under dev and docker compose" requirement. Fixed with a small dev-only Vite
  middleware (`serveWellKnownInDev`, `apply: 'serve'`, `configureServer`
  `order: 'pre'` so it precedes the TanStack Start / Nitro dev handler) that
  serves `public/.well-known/**` with a path-traversal guard. Dev and prod now
  return 200 for all three paths. Awaiting PR + CI + review.
