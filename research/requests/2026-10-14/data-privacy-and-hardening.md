# Request: User Data Privacy and Production Hardening

Source: the second bullet of [as-written.md](./as-written.md), with all its
sub-bullets.
Path: **research → plan → implement**, per the user.
Builds on the decided research in
[../../security-privacy/index.md](../../security-privacy/index.md), especially
[pdf-and-annotation-data-protection.md](../../security-privacy/pdf-and-annotation-data-protection.md)
(LUKS at rest; every PDF read proxied through the app server with an ownership
check), and on
[../../system-architecture/data-sharing-boundaries.md](../../system-architecture/data-sharing-boundaries.md)
(per-user scoping).

## The user's words

> As other people start using my app publically, let's start to ensure certain
> safeguards on user data and privacy:
> * (since the literature tracker is the current public facing app then this is
>   where we discuss the following safeguards; but the guidance we decide upon
>   will also apply to future features and apps I build on my website).
> * we already have separate document stores for different users; thus we can
>   prevent DMCA type issues so that users don't upload pirated documents that
>   are publically accessible by other users.
> * But, I want to add data privacy restrictions, which furthermore protects me
>   from users uploading illicit content:
>   * e.g. is it possible for us to use client-side encrypted data (which can
>     still be accessed across multiple devices?)
> * any other considerations for hardening the app/adding things to the design
>   for a production general users.
> * furthermore, for existing users and data, we should create a job which
>   automatically and seamlessly transitions existing user data into the new
>   hardened scheme (where after the transition is done then we can remove the
>   old unencrypted functions and then remove the transition job)

## Requirements

| ID | Requirement | The user's words |
|---|---|---|
| P1 | The motivation: other people are starting to use the app publicly, so user data and privacy need safeguards. | "As other people start using my app publically, let's start to ensure certain safeguards on user data and privacy" |
| P2 | **Scope.** The safeguards are worked out on the Literature Tracker, the public app today. The guidance must be written as **site-wide** policy that binds future features and apps. Put it high in the hierarchy, not only in lit-tracker docs. | "since the literature tracker is the current public facing app then this is where we discuss the following safeguards; but the guidance we decide upon will also apply to future features and apps I build on my website" |
| P3 | **Already true; keep it:** each user's documents are stored separately and never public, so a pirated upload is not distributed to other users (the DMCA concern). | "we already have separate document stores for different users; thus we can prevent DMCA type issues so that users don't upload pirated documents that are publically accessible by other users" |
| P4 | **Add privacy restrictions.** Their stated second purpose is protecting the operator from users uploading **illicit content**. | "I want to add data privacy restrictions, which furthermore protects me from users uploading illicit content" |
| P5 | **Investigate client-side encryption**, where the data **must still be reachable from multiple devices**. The user phrased it as a question ("is it possible"). Research must answer it, with its costs, not assume yes. | "e.g. is it possible for us to use client-side encrypted data (which can still be accessed across multiple devices?)" |
| P6 | **Any other hardening** or design additions a production app for general users should have. This is open-ended: research should survey and propose. | "any other considerations for hardening the app/adding things to the design for a production general users" |
| P7 | **Migrate existing users and data** with a job that moves them into the new scheme **automatically and seamlessly**. | "for existing users and data, we should create a job which automatically and seamlessly transitions existing user data into the new hardened scheme" |
| P8 | **Then remove the old path.** Once the transition is done, delete the unencrypted code paths, then delete the transition job itself. | "after the transition is done then we can remove the old unencrypted functions and then remove the transition job" |

## Questions the research must answer

These are noted so they are not lost. None is decided here.

- **P5 against what the server does with a paper today.** The server reads every
  upload:
  - GROBID extraction of metadata and references;
  - Semantic Scholar enrichment;
  - the outline read with pdfium (#29);
  - citation matching (#10, #25);
  - search over titles and authors (#8).

  With end-to-end encryption, the server cannot read the PDF or anything stored
  encrypted. Research must say which of these move to the client, which stop,
  and which data stays plaintext, with the privacy cost of each. The same
  question applies to Zero's sync (`zero-cache` replicates Postgres rows), to
  Postgres queries and filters that run on the server, and to the GROBID
  service.
- **P5, multi-device keys.** How a second device gets the key: passphrase
  derivation, device enrolment, passkeys or WebAuthn PRF, a recovery key. What
  happens when a user loses every device and the passphrase. Sign-in is Google
  OAuth today ([../../technologies/auth.md](../../technologies/auth.md)), and it
  yields no secret the server can't also see.
- **P4, what protects the operator.** Research the legal and practical
  position, rather than assuming encryption achieves it: how
  operator-inaccessible storage relates to liability, duties to act on notice,
  and abuse handling for a small personally run service. Also which
  jurisdiction's rules apply.
- **P7 against P5.** A server job cannot encrypt data with a key that only the
  client holds. "Automatically and seamlessly" may mean the transition runs in
  the client at the user's next sign-in, or in two phases. Research must say
  what is possible, and what happens to users who never return.
- **P6 candidates to survey** (a starting list, not a decision):
  - rate limiting and abuse controls;
  - upload validation beyond size and type;
  - account deletion completeness;
  - data export for users;
  - a privacy policy and terms of service;
  - audit logging that does not log content;
  - dependency and secret hygiene already decided in CI;
  - session hardening already decided;
  - error reporting without user data;
  - email or contact for abuse;
  - age and terms consent at sign-up.
- **Interactions with the other requests:**
  - **Quotas** ([quotas.md](./quotas.md)) must be measurable on ciphertext.
  - **Admin statistics** ([admin-dashboards.md](./admin-dashboards.md)) must be
    computable without plaintext. The user requires that admins see only
    aggregate statistics.
  - **Backups** ([backups.md](./backups.md)) of encrypted data can't restore
    data whose key is lost.
