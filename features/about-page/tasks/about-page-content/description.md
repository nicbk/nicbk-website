# Task: About Page Content

Deliver the `/about` page itself, matching
[about-page.png](../../../../high-level-guidance/design/about-page.png), on
top of the key artifacts published by `gpg-key-publishing`.

## What this task does — concretely

- Implement the page as a colocated component (following the home-page
  precedent):
  `src/routes/(personal-site)/-components/about-page/about-page.{tsx,module.css}`,
  with `src/routes/(personal-site)/about.tsx` replacing the current
  placeholder and wiring the route to the component.
- Render exactly the mockup content, in order:
  - An **"about"** heading (the page's main heading / focus-handoff target).
  - **Résumé/CV** link → `/nicbk_cv.pdf`; **LinkedIn** link →
    `https://www.linkedin.com/in/nicbk`.
  - A divider.
  - **Communication**: **Mail** `nicolas@nicbk.com` and **Academic Mail**
    `nicbk@stanford.edu`, shown in the mockup's obfuscated plain-text form
    (`nicolas at nicbk dot com`), not as `mailto:` links; the note that mail
    may be signed/encrypted and the active GnuPG key is listed below and
    changes periodically; a **Fingerprint** row whose value is **imported
    from `src/gpg/fingerprint.generated.ts`** (never a literal in this file);
    a **Public Key** row labelled with the owner/mail and linking
    `/pgp/nicbk.asc`.
  - A divider.
  - **Version Control**: **GitHub** `nicbk` (→ `https://github.com/nicbk`)
    and **GitLab** `nicbk` (→ `https://gitlab.com/nicbk`), and the note that
    projects are usually hosted on GitHub.
- Style purely from design tokens via the CSS Module (dividers, section
  spacing, label/value alignment matching the mockup); reuse the existing
  visually-consistent header-aligned padding.
- Match the mockup in both light and dark themes.

## Not in this task

- The WKD/`.asc`/fingerprint generation (done in `gpg-key-publishing`).
- Any other page or navigation change.
- Making the mail addresses live `mailto:` links (deliberately kept as
  obfuscated text to match the mockup).
