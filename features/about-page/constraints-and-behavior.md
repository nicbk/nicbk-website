# Constraints and Behavior: About Page

Acceptance criteria for the feature as a whole. Each task's own
`constraints-and-behavior.md` states which of these it satisfies.

## Page content and layout

- `/about` renders exactly the content and layout of
  [about-page.png](../../high-level-guidance/design/about-page.png):
  - An **"about"** heading.
  - A **Résumé/CV** link (to the served `nicbk_cv.pdf`) and, below it, a
    **LinkedIn** link (`https://www.linkedin.com/in/nicbk`).
  - A divider.
  - A **Communication** section: a **Mail** address and an **Academic Mail**
    address; a note that email may be signed/encrypted and that the active
    GnuPG key is listed below and changes periodically; a **Fingerprint** row
    and a **Public Key** row (labelled with the key's owner/mail).
  - A divider.
  - A **Version Control** section: **GitHub** and **GitLab** usernames, and a
    note that projects are usually hosted on GitHub.
- Content is **entirely static** — no data fetching, no reactive
  subscription, no loading/empty state.
- Mail addresses are shown in the mockup's obfuscated plain-text form
  (e.g. `nicolas at nicbk dot com`), matching the image, rather than as live
  `mailto:` links.
- The page renders inside the existing sticky header shell and inherits its
  theming; it is correct in both light and dark themes.
- Correct document heading structure, with a main heading the shell's
  client-navigation focus handoff can target.

## GPG key publishing

- A self-hosted **WKD** serves the key at the direct-method path
  `/.well-known/openpgpkey/hu/<wkd-hash>`, with a `policy` file alongside it,
  such that a WKD lookup for the key's email resolves the served key.
- A directly-downloadable armored **`.asc`** key is served and linked from
  the page's **Public Key** row.
- The **fingerprint shown on the page is derived from the same source key**,
  not maintained as an independently-edited string. There is exactly one
  hand-maintained copy of the key material (the committed `.asc`); every
  other representation (WKD binary, displayed fingerprint) is generated from
  it.
- Regenerating after a key rotation is a file swap (`public/pgp/nicbk.asc`)
  plus re-running the generator — no edit to the displayed fingerprint or any
  page code.
- CI fails if the committed generated artifacts do not match what the
  generator produces from the current `.asc` (no silent drift).

## Static-asset serving

- The app serves static files from `public/` (first feature to need it): the
  résumé PDF, the `.asc` key, and the WKD files, at stable public paths. The
  extension-less WKD key file is served in a form a WKD client accepts.

## Cross-cutting quality

- WCAG 2.2 AA, consistent with the site-wide target: 4.5:1 text / 3:1
  non-text contrast in both themes, visible focus indicators on every link,
  accessible names on all controls, valid heading structure.
- Runs identically via `npm run dev` and `docker compose up`; the production
  image (which does not run the generator) serves the committed artifacts.
- CI (Biome, typecheck, unit tests with ratchet coverage, Playwright e2e +
  axe, PR-title lint, and the new GPG-artifact drift check) passes.

## Explicitly out of scope

- Any data-layer service, authentication, or reactive data.
- Rotating/renewing the (currently expired) key itself — the pipeline is
  built to accept a new key by file swap, but providing that key is a
  separate user action, not this feature's work.
- The projects, blog, and 404/error pages.
- Delegated WKD, keyservers as the primary source, or the optional
  keys.openpgp.org secondary pointer (the research keeps these out of the
  primary mechanism).
