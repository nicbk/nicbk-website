# Testing: About Page Content

## Unit (Vitest + Testing Library)

- The about page renders every mockup element: the "about" heading; the
  Résumé/CV link (href `/nicbk_cv.pdf`) and LinkedIn link (href
  `https://www.linkedin.com/in/nicbk`); both mail addresses in their
  obfuscated form; the sign/encrypt note; the Fingerprint row; the Public Key
  row (href `/pgp/nicbk.asc`); the GitHub and GitLab rows (correct hrefs) and
  the "usually host projects on GitHub" note.
- The rendered fingerprint **equals the imported generated constant** (not a
  literal) — the guard against re-hard-coding it.
- Exactly one main heading is present (focus-handoff target / document
  structure).

## End-to-end (Playwright)

- **Smoke:** `/about` loads inside the header and shows the heading and both
  section labels (Communication, Version Control).
- **Links served:** requests to `/nicbk_cv.pdf` and `/pgp/nicbk.asc` return
  200 with sensible content types (the page's two internal asset links
  actually resolve).
- **Theming:** no flash of the wrong theme; correct in both themes (reuses the
  shared theming assertions).

## Accessibility

- `@axe-core/playwright` inline on `/about` passes (critical/serious) in both
  themes.
- Heading structure valid; every link has a discernible name; contrast and
  focus indicators meet AA in both themes.

## Not tested here

- WKD resolution / generator determinism / drift (covered by
  `gpg-key-publishing`).
- Cross-page navigation mechanics (covered by the shell feature).
