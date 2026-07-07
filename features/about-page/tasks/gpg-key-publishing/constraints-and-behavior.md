# Constraints and Behavior: GPG Key Publishing

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"GPG key publishing" and "Static-asset serving" sections):

- Self-hosted WKD serves the key at the direct-method path
  `/.well-known/openpgpkey/hu/<wkd-hash>` with a `policy` file alongside, such
  that a WKD lookup for `nicolas@nicbk.com` resolves the served key.
- A directly-downloadable armored `.asc` key is served (at `/pgp/nicbk.asc`)
  for the page to link.
- The displayed fingerprint is derived from the source key, with exactly one
  hand-maintained copy of the key material (`public/pgp/nicbk.asc`); the WKD
  binary and the fingerprint constant are both generated from it.
- Rotation is a file swap plus a regenerate — no edit to the fingerprint or
  any code.
- CI fails if committed generated artifacts don't match generator output.
- The app serves static files from `public/`, with the extension-less WKD key
  file served in a form a WKD client accepts.

## Behavior details

- **Source of truth:** `public/pgp/nicbk.asc`. The generator never writes to
  it; it only reads it.
- **Determinism:** running the generator twice on an unchanged `.asc`
  produces byte-identical outputs (so the drift check is stable, not flaky on
  incidental ordering/timestamps).
- **WKD file:** the `hu/<hash>` file is the binary, minimized public key for
  the `nicolas@nicbk.com` user ID, importable by an OpenPGP client to the
  same fingerprint as the source key.
- **Fingerprint constant:** a valid 40-hex-character fingerprint; for the
  current key, `F835BB53D8D44AAC92F5C1F6B7BB84802180025E`.
- **Serving:** requesting `/.well-known/openpgpkey/hu/<hash>`, the `policy`
  file, and `/pgp/nicbk.asc` returns 200 with sensible content types, both
  under `npm run dev` and `docker compose up`. The production image serves
  the committed artifacts and does **not** run the generator (no `gpg`
  dependency in the image).
- **Known state:** the current key is expired; the task does not treat that
  as an error — it publishes whatever valid-format `.asc` is committed and is
  designed for a later drop-in replacement.

## Dependencies

- The app shell / server and CI pipeline from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md) (extends
  the existing CI workflow with the drift-check step; does not create CI).
