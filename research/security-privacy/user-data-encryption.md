# User Data Encryption

Researched: 2026-10-14. Decided: not yet — awaiting the user.

Whether user data in the Literature Tracker can be encrypted so that it is still
reachable from several devices, and how existing data moves into that scheme.
Answers **P5**, **P7** and **P8** of
[data-privacy-and-hardening.md](../requests/2026-10-14/data-privacy-and-hardening.md),
and records the interactions with quotas (**Q1**, **Q2**,
[quotas.md](../requests/2026-10-14/quotas.md)), admin statistics (**D5–D7**,
[admin-dashboards.md](../requests/2026-10-14/admin-dashboards.md)) and backups
(**B1–B6**, [backups.md](../requests/2026-10-14/backups.md)). It revisits the
client-side encryption that
[pdf-and-annotation-data-protection.md](./pdf-and-annotation-data-protection.md)
rejected in 2026-07 because GROBID needs the plaintext PDF. Whether encryption
protects the *operator* (P4) is answered in
[operator-liability-and-policies.md](./operator-liability-and-policies.md), not
here. Every question below is collected in
[decisions.md](../requests/2026-10-14/decisions.md).

**Summary.**

- **Yes, it is possible.** A second device gets the key from a recovery code, a
  passkey with the WebAuthn PRF extension, or approval from a device that is
  already unlocked. Bitwarden, 1Password, Proton, Ente, Apple ADP and Messenger
  all work this way.
- **The cost is not mainly cryptography.** It is (1) permanent data loss for a
  user who loses every device and the recovery code; (2) a conflict with the
  server-side PDF processing (GROBID, Semantic Scholar, citation matching);
  (3) a web app's encryption still trusts the JavaScript the server sends; and
  (4) migration needs one action from each user.
- **Recommended: "zero-access" encryption (option d), Proton Mail's model.** The
  server processes an upload in memory, then stores it and everything derived
  from it encrypted to the user's public key. It can never read stored data
  again. About 6–10 weeks of solo work. If permanent data loss is not
  acceptable, choose server-held keys (option a) instead, about 1–2 weeks.

Source caveat: the researcher could not open pages directly; every web claim
comes from search-result pages. Claims marked *uncertain* could not be
confirmed against a primary page. Browser PRF support and Semantic Scholar's
CORS headers could not be tested and are checks for the plan.

## Options

### The four options

| Option | Protects stored data against | Does **not** protect against | Data-loss risk | Effort (solo, rough) |
|---|---|---|---|---|
| **(a) Server-held per-user keys** (envelope keys wrapped by a master key in the host env file, or Garage SSE-C) | Stolen disks (LUKS already does this); **off-site backup leaks**; crypto-shredding on account deletion if keys are kept out of the data backups | The operator, anyone with the env file, a compromised app server. D7 holds by policy only | Only if the master key is lost | **1–2 weeks.** Migration is a plain server job; P7/P8 met as worded |
| **(b) PDFs only** (in practice zero-access for PDFs, metadata plaintext) | Stored PDFs | Titles, references, notes, annotations; uploads as they arrive; malicious JS | Yes, PDFs | **4–6 weeks.** Key management is most of it |
| **(d) Zero-access, everything** | All stored content, against the operator browsing the DB or Garage, backups, a later compromise, admin tooling (D7 by construction) | Content **at upload time**: a compromised server could copy new uploads, as Proton concedes for mail. Structural metadata. Malicious JS ([CISPA](https://cispa.de/en/research/publications/213253-trust-on-reload-securing-browser-based-end-to-end-encryption), [Wong](https://cryptologie.net/posts/browser-end-to-end-encryption/), [devever](https://devever.net/~hl/webcrypto)) | Yes, everything | **6–10 weeks** |
| **(c) Full client-side processing** | All of (d), plus uploads | Malicious JS; structural metadata | Yes, everything | **Months**, and the GROBID-based features are lost or degraded |

Effort is a cliff, not a slope: key management (setup, unlock, recovery,
passkeys, device linking, reset) costs about 3–4 weeks including UI and tests,
and (b), (c) and (d) all pay it.

### Getting the key onto a second device

Google sign-in stays the *authentication* layer. It yields no secret the server
cannot also see, so the key must come from a second, independent factor.

| Mechanism | How a new device gets the key | Notes |
|---|---|---|
| **Recovery code** | The user enters a random code (e.g. 24 words) | Universal. Needs no slow KDF because it is random. Ente, Notesnook, Standard Notes, Proton, Apple ADP and 1Password all use one |
| **Passkey + WebAuthn PRF** | A synced passkey yields a stable secret that unwraps the key | **Uneven support; sources conflict** ([Corbado](https://www.corbado.com/blog/passkeys-prf-webauthn), [mera](https://mera.category.xyz/authenticator-support/)). Chrome profile passkeys return no PRF; 1Password's extension was reported broken in mid-2026 ([1Password community](https://www.1password.community/developers-69/browser-extension-webauthn-prf-extension-not-spec-compliant-24672)). Must be optional with a fallback, as Bitwarden does ([Bitwarden](https://bitwarden.com/help/login-with-passkeys)). Whether Better Auth's passkey plugin exposes PRF output to client code is unconfirmed ([Better Auth](https://better-auth.com/docs/beta/plugins/passkey)) |
| **Device linking** | An unlocked device seals the key to a new device's ephemeral key, set up by QR code or in-app approval | App logic. 1Password Setup Code ([1Password](https://support.1password.com/secret-key/)), Bitwarden trusted devices ([Bitwarden](https://bitwarden.com/help/about-trusted-devices/)), Matrix session verification ([FU Berlin](https://wiki.physik.fu-berlin.de/it/services:matrix:encryption)) |
| **Passphrase** | The user types a second password | Argon2id is not in browser WebCrypto; it would come from WASM or JS ([mojoauth](https://mojoauth.com/security-guides/argon2-in-javascript-in-browser)). A second password on top of Google |
| **Device-held key** (stay unlocked) | A non-extractable `CryptoKey` in IndexedDB ([W3C list](https://lists.w3.org/Archives/Public/public-webcrypto/2012Dec/0025.html), [WebKit](https://bugs.webkit.org/show_bug.cgi?id=183167)) | Safari deletes script-written storage after 7 days without interaction ([Didomi](https://docs.didomi.io/releases-and-announcements/announcements/apple-implements-7-day-cap-on-script-writable-storage), [mjtsai](https://mjtsai.com/blog/2020/03/26/safari-13-1-third-party-cookie-blocking-and-7-day-script-writeable-storage/)), so occasional Safari users unlock again |

Every product found says loss is permanent: Ente ([FAQ](https://ente.com/help/photos/faq/security-and-privacy)),
Notesnook ([help](https://notesnook.com/help/how-is-my-data-encrypted)),
Obsidian Sync ([security](https://obsidian.md/help/sync/security)), Tresorit
([reset erases files](https://support.tresorit.com/hc/en-us/articles/216114507-Reset-your-account)),
Apple ADP ([recovery key](https://support.apple.com/109345)) and Messenger
([explained](https://about.fb.com/news/2024/03/end-to-end-encryption-on-messenger-explained/)).
The common pattern: the user saves a recovery kit before anything is
encrypted, the app says plainly it cannot recover data, recovery status stays
visible in settings, and "reset account" deletes the encrypted data.

**Key hierarchy (any E2EE option).** Per user, an X25519 key pair made in the
browser: the public key stored in plaintext, the private key stored only
wrapped, once per unlock method. Per object, a random data key wrapped to the
public key (age gives every file its own key, [age spec](https://github.com/C2SP/C2SP/blob/main/age.md)).
Adding or removing an unlock method only re-wraps the private key
([envelope encryption](https://workos.com/blog/envelope-encryption-explained)).
Removing a device does not revoke a key it already copied; only replacing the
key pair does, which re-encrypts all of that user's data.

The **public key** is what makes this project workable: the server can encrypt
*to* a user (new uploads, extraction results, migration) without being able to
decrypt. This is Proton's "zero-access" model for incoming mail, which admits
the server sees the message "for a split second"
([Reclaim The Net](https://reclaimthenet.org/protonmail-review),
[Proton](https://proton.me/support/proton-mail-encryption-explained));
libsodium sealed boxes are the textbook primitive
([libsodium](https://doc.libsodium.org/public-key_cryptography/sealed_boxes)).

### Libraries

| Option | Fit |
|---|---|
| **WebCrypto AES-GCM alone** | Not recommended. One-shot, so a 50 MB PDF needs hand-rolled chunk framing, which is where mistakes happen ([datastream](https://datastream.js.org/docs/packages/encrypt)) |
| **libsodium.js** | Mature (Ente, Notesnook). Chunked streams, sealed boxes, Argon2id; runs in Node too ([hat.sh](https://github.com/i13e/hat.sh)) |
| **age / typage** (BSD-3) | Best fit for PDF blobs: one format on server and browser, X25519 recipients, passkey/PRF recipients built in, ~0.025% overhead ([typage](https://github.com/FiloSottile/typage)). Caveats: a 0.x version (0.3.1, [JSR](https://jsr.io/@age/age-encryption)) and modest activity |

The CSP already allows WASM (`'wasm-unsafe-eval'`, see
[app-security-headers.md](./app-security-headers.md)). Performance of one
X25519 operation per sealed row over 1,000+ papers is *uncertain* and should
be measured.

### What changes in this app under option (d)

| Subsystem | Under (d) |
|---|---|
| PDF upload and Garage | Server encrypts to the public key; plaintext never written to Garage. Extraction is asynchronous today, so either extract inside the upload request (slow) or keep a temporary copy under a per-job key deleted at job end |
| GROBID, Semantic Scholar, outline | Run once, transiently, at upload. Under (c) there is no browser GROBID ([benchmark](https://arxiv.org/pdf/2303.09957)); client heuristics lose the reference list and its `coords`, which the citation features depend on. Whether `api.semanticscholar.org` allows browser calls (CORS) is **unverified** |
| Citation matching | Moves to the browser after unlock (`isSameWork` is already pure). A server-side blind index leaks equality and fits (d) poorly ([CipherSweet](https://ciphersweet.paragonie.com/security)) |
| Reference re-read job | **Stops for stored papers.** Any future server feature over old data needs the client to re-upload plaintext. A permanent cost the site-wide policy (P2) must state |
| Zero sync | Sensitive columns become one opaque `sealed` column per row; filters on ids and orderings on timestamps still work. `tags.orderBy('name')` moves to the client. Mutators carry ciphertext. The browser's IndexedDB replica then holds ciphertext ([Replicache](https://trunk.doc.replicache.dev/tutorial/constructing-replicache)) |
| Search (#8) | Already client-side; unchanged. The unused `authors_search` column can be dropped |
| Browser PDF cache | Holds ciphertext; signing out no longer leaves readable PDFs |

Plaintext left under (d): ids, timestamps, statuses, sizes, page indexes, the
link graph between a user's own article ids, and the upload filename unless it
is sealed or dropped. Under (b) "PDFs only", titles, abstracts, references,
highlight text and notes stay readable, which is most of what reveals what a
user reads and thinks.

### Migrating existing data (P7, P8)

"A server cannot encrypt with a key it does not hold" is false for public
keys. Once a user has registered one, a pg-boss job can encrypt all of their
existing data. Proposed phases for (d):

1. Ship key setup and the zero-access write path; new users set up keys first.
2. At an existing user's next sign-in, one short blocking step: "Save your
   recovery kit". This is the one unavoidable user action: a recovery secret
   the user never saw cannot save them. Standard Notes ([security updates](https://standardnotes.com/help/security))
   and Messenger upgraded the same way.
3. A server job per user, triggered by key registration: read, encrypt to a
   **new** object key, flip the row in one transaction, delete the plaintext.
   Idempotent and resumable. Never overwrite an object in place (see the
   backup revision in
   [backup-and-disaster-recovery.md](../devops-deployment/backup-and-disaster-recovery.md#revision-proposed-2026-10-14-awaiting-the-user)).
4. Purge residues: Postgres dead tuples (`VACUUM`, or a table rewrite), Garage
   garbage collection, the zero-cache replica, and every pre-migration backup
   (by retention expiry or purge).
5. Users who never return have no key. Choices: keep plaintext (contradicts
   P8); an announced deadline by email, then export or delete (needs a Terms
   clause); interim server-key encryption (a) until the deadline; or the server
   generates their keys and emails the recovery code (**not recommended**: the
   secret passes through the server and the mail provider).

Then P8: remove plaintext *storage and read-back* paths and the job. Under (d)
plaintext *handling at upload* remains by design. Under (a) the whole
migration is a server job with no user action.

### Interactions with the other requests

- **Quotas (Q1, Q2):** measured on ciphertext size and proxied ciphertext
  bytes; age adds ~0.025%. No plaintext needed.
- **Admin statistics (D5–D7):** counts, bytes and timestamps stay plaintext.
  Under (d) or (c), D7 holds by construction for content; under (a) by policy.
- **Backups (B1–B6):** public keys and wrapped private keys **must** be in the
  backup, or everyone's data is lost. A backup cannot help a user who lost
  their recovery secret. Under (a) the master key must be backed up
  separately from the data.
- **Account deletion:** under (d) backup copies stay encrypted to a key only
  the user's recovery code unwraps (unreadable, not shredded); under (a)
  destroying the user's key shreds every backup copy.
- **Abuse (P4):** under (d) the operator cannot inspect content to act on a
  report; suspension and deletion still work. Encryption should not be assumed
  to achieve P4.

## Recommendation

*A recommendation, not a decision.* **Option (d), zero-access**, if the user
accepts permanent loss for users who lose every device and their recovery kit:

- PDFs, metadata, references, annotations, notes and tag names encrypted to a
  per-user X25519 public key; age (typage) for blobs.
- Extraction stays on the server, transiently.
- A mandatory recovery code, optional passkey PRF where it works, device
  linking, and a device key in IndexedDB so daily use needs no typing.
- A one-time "save your recovery kit" step, then a server migration job, plus
  a dated deadline for dormant accounts.

**If permanent data loss or about two months of work is not acceptable,
choose (a).** It gives most of the practical protection for a single home
server (off-site backups, deletion shredding, no plaintext on the backup
target) with no user-facing change. It does not make the operator unable to
read data. (c) is not recommended.

## Reasoning

- (d) is the only option that makes D7 true by construction without giving up
  GROBID, Semantic Scholar and the citation features this app is built around.
- Its migration really is a server job once a key exists, which is the closest
  achievable reading of P7's "automatically and seamlessly".
- Its weak point, plaintext at upload, is honest and documented, the same
  trade Proton makes for incoming mail.
- (c) costs the citation features and still trusts server-delivered
  JavaScript, so it buys little over (d).

## Questions for the user

Numbered as in [decisions.md](../requests/2026-10-14/decisions.md).

- **E1.** Must the operator be *unable* to read stored content (needs d or c),
  or is protection against thieves and backup leaks enough (a)?
- **E2.** Is permanent loss of a user's library acceptable when they lose every
  device and the recovery kit?
- **E3.** Is plaintext at upload time acceptable (d), or must the server never
  see plaintext (c), losing the GROBID features?
- **E4.** Which fields may stay plaintext: reading status and position, fold
  state, annotation page index, upload filename, timestamps?
- **E5.** Dormant users: how long a deadline, what happens at it (delete, or
  export link then delete), and may they be emailed at their Google address?
- **E6.** Which unlock methods: recovery code only, plus passkey PRF, plus a
  passphrase?
- **E7.** Is "the server will not run new extraction over old papers" acceptable
  as a site-wide rule for future features (P2)?

## Sources

Key management and products
- [corbado.com — passkeys PRF](https://www.corbado.com/blog/passkeys-prf-webauthn) — PRF support by platform and provider, March 2026.
- [mera.category.xyz — authenticator support](https://mera.category.xyz/authenticator-support/) — tested PRF matrix; Chrome profile passkeys return no PRF.
- [1Password community](https://www.1password.community/developers-69/browser-extension-webauthn-prf-extension-not-spec-compliant-24672) — 1Password extension PRF regression, mid-2026.
- [Bitwarden — login with passkeys](https://bitwarden.com/help/login-with-passkeys), [trusted devices](https://bitwarden.com/help/about-trusted-devices/) — PRF unlock with fallback; device approval.
- [Better Auth passkey plugin (beta docs)](https://better-auth.com/docs/beta/plugins/passkey) — `extensions` pass-through.
- [typage](https://github.com/FiloSottile/typage), [JSR @age/age-encryption](https://jsr.io/@age/age-encryption) — age in TypeScript; version 0.3.1.
- [Ente architecture](https://ente.com/architecture), [Ente FAQ](https://ente.com/help/photos/faq/security-and-privacy), [Ente Locker encryption](https://community.ente.io/help/locker/features/security/encryption) — key hierarchy; loss is unrecoverable.
- [Standard Notes encryption](https://standardnotes.com/help/security/encryption), [security updates](https://standardnotes.com/help/security) — re-wrap on password change; upgrade at next sign-in.
- [Notesnook](https://notesnook.com/help/how-is-my-data-encrypted), [Obsidian Sync](https://obsidian.md/help/sync/security) — primitives; unrecoverable; Obsidian's managed (non-E2EE) mode.
- [Tresorit forgot password](https://support.tresorit.com/hc/en-us/articles/216114497-Forgot-your-password), [reset](https://support.tresorit.com/hc/en-us/articles/216114507-Reset-your-account) — reset erases data.
- [Proton reset password](https://proton.me/support/reset-password), [device recovery](https://proton.me/support/device-data-recovery), [encryption explained](https://proton.me/support/proton-mail-encryption-explained), [Reclaim The Net](https://reclaimthenet.org/protonmail-review) — recovery phrase; zero-access for incoming mail.
- [Apple recovery key](https://support.apple.com/109345) — permanent lockout.
- [Messenger E2EE explained](https://about.fb.com/news/2024/03/end-to-end-encryption-on-messenger-explained/), [Labyrinth](https://engineering.fb.com/2023/12/06/security/building-end-to-end-security-for-messenger/), [Labyrinth 1.1](https://engineering.fb.com/2026/05/11/security/labyrinth-1-1/) — recovery setup for existing users; key rotation on device removal.
- [1Password Secret Key](https://support.1password.com/secret-key/) — Setup Code for new devices; Emergency Kit.
- [FU Berlin Matrix wiki](https://wiki.physik.fu-berlin.de/it/services:matrix:encryption) — session verification.
- [Zotero blog](https://www.zotero.org/blog/?p=2163) — Zotero sends first PDF pages to a metadata service.

Primitives
- [mojoauth — Argon2 in browsers](https://mojoauth.com/security-guides/argon2-in-javascript-in-browser) — WASM/JS Argon2id; OWASP parameters.
- [C2SP age spec](https://github.com/C2SP/C2SP/blob/main/age.md) — file key per file; ChaCha20-Poly1305 payload.
- [hat.sh](https://github.com/i13e/hat.sh) — in-browser chunked encryption with libsodium.
- [libsodium sealed boxes](https://doc.libsodium.org/public-key_cryptography/sealed_boxes) — encrypt to a public key.
- [datastream encrypt](https://datastream.js.org/docs/packages/encrypt) — a browser AES-GCM library buffers whole payloads.
- [WorkOS — envelope encryption](https://workos.com/blog/envelope-encryption-explained) — rotation re-wraps data keys only.
- [W3C webcrypto list](https://lists.w3.org/Archives/Public/public-webcrypto/2012Dec/0025.html), [WebKit bug 183167](https://bugs.webkit.org/show_bug.cgi?id=183167) — non-extractable keys in IndexedDB.
- [Didomi](https://docs.didomi.io/releases-and-announcements/announcements/apple-implements-7-day-cap-on-script-writable-storage), [mjtsai](https://mjtsai.com/blog/2020/03/26/safari-13-1-third-party-cookie-blocking-and-7-day-script-writeable-storage/) — Safari 7-day storage cap.

Threat model, search and processing
- [CipherSweet security](https://ciphersweet.paragonie.com/security) — blind-index leakage.
- [CISPA — Trust on Reload](https://cispa.de/en/research/publications/213253-trust-on-reload-securing-browser-based-end-to-end-encryption), [cryptologie.net](https://cryptologie.net/posts/browser-end-to-end-encryption/), [devever.net](https://devever.net/~hl/webcrypto) — server-delivered code can exfiltrate keys.
- [arXiv 2303.09957](https://arxiv.org/pdf/2303.09957) — extraction benchmark: GROBID best; all server-side.
- [Replicache tutorial](https://trunk.doc.replicache.dev/tutorial/constructing-replicache) — client store persists in IndexedDB.
- Repository: `src/db/schema/lit-tracker.ts`, `src/zero/queries.ts`, `src/lit-tracker/**` (the columns, filters and server stages analysed above).
