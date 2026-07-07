# Testing: About Page

Testing requirements for the feature as a whole, per the decided testing
tiers (see [research.md](./research.md) for citations). Each task's
`testing.md` states the concrete tests that task must add.

## Tiers in play

No data layer, so the **integration tier** (Testcontainers Postgres/Garage)
does not apply. Coverage is unit + e2e + inline accessibility, plus a CI
drift check for the generated GPG artifacts.

## Unit (Vitest + `@testing-library/react`, jsdom)

- The about page renders every element of the mockup: the heading, the
  Résumé/CV and LinkedIn links (with correct hrefs), both mail addresses, the
  sign/encrypt note, the Fingerprint row, the Public Key row (linking the
  `.asc`), and the GitHub/GitLab rows with their note.
- The displayed fingerprint comes from the generated constant, not a literal
  in the component — asserted by rendering and matching the constant's value
  (so a future rotation can't leave the page showing a stale hard-coded
  fingerprint).
- The fingerprint constant module has the expected shape (a valid 40-hex-char
  fingerprint) so a malformed generation is caught at the unit level.
- Any non-trivial pure helper (e.g. fingerprint formatting) is unit-tested
  directly.

## Generator / artifact integrity

- The generator is deterministic: running it twice on the same `.asc`
  produces byte-identical outputs.
- **CI drift check**: CI re-runs the generator and fails if the committed WKD
  files or fingerprint constant differ from freshly-generated output. This is
  the guarantee that the served artifacts always match the source key.
- The generated WKD key is valid and resolvable: importing the served
  `hu/<hash>` file yields the expected key/fingerprint, and the derived
  fingerprint matches the key in `public/pgp/nicbk.asc`.

## End-to-end (Playwright)

- **Smoke**: `/about` loads and shows the heading and the section labels
  (Communication, Version Control).
- **Links**: the Résumé/CV, LinkedIn, and Public Key (`.asc`) links have the
  expected hrefs; the `.asc` and PDF are actually served (a request to their
  paths returns 200 with a sensible content type).
- **WKD**: the WKD key file and `policy` are served at the well-known path;
  the key file is fetchable and parses as an OpenPGP key. (Full mail-client
  auto-discovery is verified manually via `gpg --locate-keys`; the e2e only
  asserts the files are served correctly.)
- **Theming**: `/about` shows no flash of the wrong theme and is correct in
  both themes (reuses the shared theming assertions).

## Accessibility

- `@axe-core/playwright` runs inline on `/about` in both themes, blocking on
  critical/serious findings.
- Heading structure is valid; every link has a discernible accessible name;
  contrast and focus indicators meet AA in both themes.

## Coverage / gating

- Vitest `v8` coverage, unit-only, ratchet-style (must not drop PR-over-PR).

## Framework caveat to carry

Same flagged TanStack Start + Playwright hydration/routing-timing flakiness
as the shell feature: assert on settled DOM state, don't race hydration.
