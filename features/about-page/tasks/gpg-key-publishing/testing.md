# Testing: GPG Key Publishing

## Unit (Vitest)

- The generated fingerprint constant module has the expected shape: a
  40-hex-character uppercase fingerprint, and any display-formatting helper
  produces the expected grouping.
- Any pure helper in the generator (e.g. fingerprint normalization/formatting)
  is unit-tested directly.

## Generator / artifact integrity

- **Determinism:** running `scripts/gen-gpg-artifacts.mjs` twice on the same
  `.asc` yields byte-identical WKD files and fingerprint constant.
- **Correctness against the source key:** importing the generated
  `hu/<hash>` file yields a key whose fingerprint equals the source key's,
  and equals the generated fingerprint constant.
- **Drift check (the CI gate):** re-running the generator on the committed
  `.asc` leaves the committed artifacts unchanged (`git diff --exit-code`
  clean). A deliberately stale artifact makes the check fail — verified once
  when wiring the step.

## End-to-end (Playwright)

- The WKD key file and `policy` are served at
  `/.well-known/openpgpkey/hu/<hash>` and `/.well-known/openpgpkey/policy`
  (HTTP 200); the key file parses as an OpenPGP key.
- `/pgp/nicbk.asc` is served (HTTP 200, armored key body).

## Manual verification (recorded in status.md)

- `gpg --locate-keys nicolas@nicbk.com` (pointed at the running app / correct
  domain) discovers and imports the key via WKD, to the expected fingerprint.
  This exercises the real mail-client discovery path that automated e2e only
  approximates by asserting the files are served.

## Not tested here

- The about page rendering of the fingerprint/links (covered by
  `about-page-content`).
- Accessibility (no user-facing UI in this task).
