# Feature: About Page

The personal site's `/about` page, matching
[about-page.png](../../high-level-guidance/design/about-page.png), plus the
real GPG key publishing that the page's "Fingerprint"/"Public Key" block
stands for.

Concretely, this feature produces:

- The **static about page** at `/about`: an "about" heading, a Résumé/CV
  link and a LinkedIn link, a **Communication** section (Mail + Academic Mail
  addresses, a note that mail may be signed/encrypted, and the GPG
  Fingerprint + Public Key), and a **Version Control** section (GitHub +
  GitLab usernames), laid out exactly as in the mockup. Entirely static
  content — no dynamic/reactive data.
- The **GPG key publishing** the page relies on: a self-hosted **Web Key
  Directory (WKD)** at `/.well-known/openpgpkey/`, a directly-downloadable
  armored **`.asc`** key linked from the page, and the displayed
  **fingerprint derived from that same key** (not hand-typed), all per
  [research/security-privacy/gpg-key-publishing.md](../../research/security-privacy/gpg-key-publishing.md).

This is the first feature to serve **static file assets** (`public/`), so it
introduces that wiring — the résumé PDF, the `.asc` key, and the WKD files
are all static assets served by the app.

## Scope boundary

Static content and static key files only. This feature stands up **no** data
layer, auth, or reactive data — consistent with the rest of Phase 1. It
introduces `public/` static-asset serving; later features extend it rather
than re-introduce it.

The projects, blog, and dedicated 404/error pages are their own features
(see [../index.md](../index.md)). The app shell, header, design tokens, and
theming this page renders inside already exist from
[`app-shell-and-home`](../app-shell-and-home/description.md) and are reused,
not rebuilt.

## Known state of the published key

The key provided at spec time (`public/pgp/nicbk.asc`,
`Nicolás Kennedy <nicolas@nicbk.com>`, fingerprint
`F835BB53D8D44AAC92F5C1F6B7BB84802180025E`) is **expired** (expired
2024-04-18). Per the user's decision it is published as-is now and rotated
later; the whole pipeline is deliberately key-agnostic (derive, don't
hand-type — see [research.md](./research.md)) so rotation is a file swap plus
a regenerate, not a code change.
