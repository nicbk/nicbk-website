# Task: GPG Key Publishing

Stand up the real GPG key distribution the about page's Fingerprint/Public
Key block stands for — before the page exists — so the page can consume a
derived fingerprint and link a real key rather than hard-coding either.

## What this task does — concretely

- **Introduce `public/` static-asset serving** (first feature to need it).
  The committed source key already lives at `public/pgp/nicbk.asc`; verify
  TanStack Start/Nitro serves `public/` at the site root and that the
  extension-less WKD key file is served in a form a WKD client accepts.
- **Add `scripts/gen-gpg-artifacts.mjs`** — a Node generator that reads
  `public/pgp/nicbk.asc` (via the `gpg` CLI) and writes, all **committed**:
  - `public/.well-known/openpgpkey/hu/egg3eb1dsgmi4atdj5obrtipjpcjyocr` —
    the binary (minimized) key export for WKD direct-method lookup of
    `nicolas@nicbk.com`.
  - `public/.well-known/openpgpkey/policy` — the (empty) WKD policy file.
  - `src/gpg/fingerprint.generated.ts` — the derived fingerprint as an
    exported constant (raw 40-hex-char string plus any display formatting
    helper the page needs), with a header comment marking it generated and
    naming the generator.
  The script is deterministic (same `.asc` → byte-identical outputs) and
  documents at its top that it is the single regeneration entry point on key
  rotation.
- **Add a CI drift-check step** that re-runs the generator and
  `git diff --exit-code`s the generated paths, failing the build if the
  committed artifacts don't match the current `.asc`. This is what makes
  "derived, not hand-typed" enforceable rather than aspirational.
- Document the rotation procedure (swap `public/pgp/nicbk.asc`, re-run the
  generator, commit) in the script header and/or the README hosting notes.

## Not in this task

- The about page component or route (`about-page-content`).
- Renewing the expired key itself — the generator must work against whatever
  valid `.asc` is committed; providing a non-expired key is a user action.
- Any WKD delegation, keyserver upload, or keys.openpgp.org pointer (kept out
  of the primary mechanism by the research).
