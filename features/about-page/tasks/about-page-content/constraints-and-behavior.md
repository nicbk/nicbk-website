# Constraints and Behavior: About Page Content

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md), the
"Page content and layout" section, plus the cross-cutting quality bar):

- `/about` renders exactly the content and layout of `about-page.png`:
  heading; Résumé/CV + LinkedIn links; divider; Communication section
  (Mail + Academic Mail, sign/encrypt note, Fingerprint row, Public Key row);
  divider; Version Control section (GitHub + GitLab, note).
- Content is entirely static — no fetching, no reactive subscription, no
  loading/empty state.
- Mail addresses are shown in the mockup's obfuscated plain-text form, not as
  `mailto:` links.
- The page renders inside the existing sticky header shell, correct in both
  themes, with a valid heading structure and a main heading the shell's focus
  handoff targets.
- WCAG 2.2 AA: link contrast and visible focus indicators in both themes,
  discernible accessible names on every link, valid heading structure.

## Behavior details

- **Fingerprint is not a literal here.** The displayed value comes from
  `src/gpg/fingerprint.generated.ts`; a rotation that changes the key changes
  the page's fingerprint with no edit to this component. A unit test asserts
  the rendered value equals the constant, guarding against reintroducing a
  hard-coded string.
- **Links resolve to served assets:** Résumé/CV → `/nicbk_cv.pdf`, Public Key
  → `/pgp/nicbk.asc` (both served by `gpg-key-publishing`'s `public/` wiring);
  LinkedIn/GitHub/GitLab → their external profile URLs.
- Identical under `npm run dev` and `docker compose up`.

## Dependencies

- **`gpg-key-publishing`** — provides `src/gpg/fingerprint.generated.ts` and
  the served `/pgp/nicbk.asc` and `/nicbk_cv.pdf` (via `public/` serving) this
  page consumes.
- The shell/header/tokens/theming from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md).
