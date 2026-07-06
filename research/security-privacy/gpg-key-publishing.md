# GPG Key Publishing

Researched: 2026-07-05. Decided: 2026-07-05.

How the about page's mocked-up GPG "Fingerprint"/"Public Key" block (see
[about-page.png](../../high-level-guidance/design/about-page.png)) actually
serves the real public key, and how the page reflects the periodic key
rotation the mockup already anticipates ("The key changes periodically").

## Decision

- **Self-hosted Web Key Directory (WKD)** at
  `/.well-known/openpgpkey/`, as the primary key-distribution mechanism —
  not a keyserver, and not WKD delegated to a third party.
- **A plain static `.asc` armored key file, linked directly from the about
  page**, kept alongside WKD as the human-facing "view/download key"
  option — WKD serves mail clients, not a person clicking a link on a
  page.
- **keys.openpgp.org is not used as the primary source**, only optionally
  linked as a secondary pointer if wanted — self-hosting WKD instead
  preserves third-party signatures on the key, which keys.openpgp.org
  strips.
- **The fingerprint displayed on the about page is derived from the same
  source key at build/update time, not hand-typed as separate text.** Key
  rotation means regenerating the WKD static files and the `.asc` file
  from the new key, and the displayed fingerprint is regenerated from that
  same source rather than maintained as an independently-edited string.

## Reasoning

- WKD is current practice specifically because it removes a manual step
  for correspondents: modern mail clients (Thunderbird, KMail, Outlook)
  auto-discover and fetch a key via WKD without the sender needing to be
  told where to find it first.
- Self-hosting (rather than delegating WKD via CNAME to a provider like
  keys.openpgp.org) was chosen because delegation strips third-party
  signatures from the served key and requires trusting a third party to
  serve the correct key for this domain — self-hosting keeps both under
  this project's own control.
- WKD alone doesn't serve the "a human wants to click something on the
  about page" case, so the static `.asc` link is kept for that purpose —
  the two aren't redundant, they serve different consumers (mail clients
  vs. a page visitor).
- Deriving the displayed fingerprint from the same source key at
  build/update time (rather than hand-typing it whenever the key rotates)
  is a direct application of
  [AGENTS.md](../../AGENTS.md)'s "Avoid duplication" principle: two
  independently-maintained representations of the same fingerprint is
  exactly the kind of drift the mockup's "the key changes periodically"
  note anticipates as a real risk.
- Implementation is low-overhead for this project's shape: WKD is just
  static files at a deterministic path plus a `policy` file, servable as
  ordinary static assets — no server-side logic needed, consistent with
  this being a personal site with no dedicated mail-server infrastructure
  and no dedicated ops role.

## Sources

- [WKD - GnuPG wiki](https://wiki.gnupg.org/WKD) — WKD mechanism and
  path/policy-file specification.
- [Setting up Web Key Directory](https://miarecki.eu/posts/web-key-directory-setup/) —
  practical self-hosted WKD setup walkthrough.
- [Static OpenPGP Web Key Directory Setup](https://www.postsubmeta.net/blog/2021/02/15/static-openpgp-web-key-directory-setup/) —
  confirms WKD can be served as plain static files with no server logic.
- [PGP key discovery via Web Key Directory (WKD)](https://mentat.za.net/blog/2024/11/04/pgp-key-discovery-via-wkd/) —
  mail-client auto-discovery behavior via WKD.
- [keys.openpgp.org — about/usage](https://keys.openpgp.org/about/usage/) —
  confirms third-party-signature stripping behavior, informing the
  self-hosting decision.
