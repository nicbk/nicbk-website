# Status: About Page

**Feature state:** Spec'd, not yet started (2026-07-06). Folder written and
tasks defined; no task implemented yet. Depends only on
[`app-shell-and-home`](../app-shell-and-home/status.md) (Complete).

Feature parent issue:
[#17](https://github.com/nicbk/nicbk-website/issues/17); task sub-issues
[#18](https://github.com/nicbk/nicbk-website/issues/18) (`gpg-key-publishing`)
and [#19](https://github.com/nicbk/nicbk-website/issues/19)
(`about-page-content`), linked as native sub-issues of #17.

## Task states

| Task | State | PR | CI | Review |
|---|---|---|---|---|
| `gpg-key-publishing` | Not started ([#18](https://github.com/nicbk/nicbk-website/issues/18)) | — | — | — |
| `about-page-content` | Not started ([#19](https://github.com/nicbk/nicbk-website/issues/19)) | — | — | — |

## Definition of Done (feature)

All acceptance criteria in
[constraints-and-behavior.md](./constraints-and-behavior.md) met and each
task merged behind its own passing CI + human review. In short: `/about`
matches `about-page.png` in both themes at WCAG 2.2 AA; the Public Key /
Fingerprint block is backed by a real self-hosted WKD and a served `.asc`,
with the displayed fingerprint derived from the source key (never
hand-typed) and CI failing on artifact drift; the résumé PDF, `.asc`, and WKD
files serve identically under `npm run dev` and `docker compose up`.

## Inputs on hand (provided by user 2026-07-06)

- `public/pgp/nicbk.asc` — armored public key (source of truth). **Expired**
  2024-04-18; published as-is per user decision, to be rotated later by file
  swap + regenerate.
- `public/nicbk_cv.pdf` — résumé/CV.
- LinkedIn: `https://www.linkedin.com/in/nicbk`.
- Mail `nicolas@nicbk.com`, Academic `nicbk@stanford.edu`; GitHub/GitLab
  `nicbk` — confirmed matching the mockup.
- Fingerprint derived from the key: `F835BB53D8D44AAC92F5C1F6B7BB84802180025E`
  (matches the mockup). WKD hash: `egg3eb1dsgmi4atdj5obrtipjpcjyocr`.

## Log

- 2026-07-06 — Feature spec'd. Source files moved into `public/`
  (`nicbk.asc` → `public/pgp/`, `nicbk_cv.pdf` → `public/`). Two tasks
  defined: `gpg-key-publishing` then `about-page-content`. Awaiting
  implementation start.
- 2026-07-06 — GitHub issues filed: parent #17, sub-issues #18/#19 linked
  under it. Both sub-issues unassigned; implementation left to another
  session.
