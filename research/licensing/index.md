# Research: Licensing

Status: all 4 topics researched and decided (2026-07-05).

License compatibility/attribution considerations, given every component of
the project must be open source
(see [DESIGN.md](../../high-level-guidance/design/DESIGN.md)).

## Topics

- [dependency-license-audit.md](./dependency-license-audit.md) — Decided.
  Every dependency is permissive (MIT/Apache-2.0/ISC/BSD/PostgreSQL License)
  except two copyleft components, neither of which reaches this project's
  own code: **Garage** (AGPLv3) — a non-issue as long as it stays unmodified
  and runs as its own network service (which it already does, per
  [../devops-deployment/hosting-and-infrastructure.md](../devops-deployment/hosting-and-infrastructure.md))
  — and **Semgrep** (LGPL-2.1), invoked only as a standalone CI binary, never
  linked into the app.
  Zero (Rocicorp) confirmed Apache 2.0, closing the open question
  [../technologies/sync-engine.md](../technologies/sync-engine.md) had
  flagged. Updated 2026-07-05 to add Drizzle ORM/Kit and `drizzle-zero`
  (both Apache-2.0), added after this audit's original pass once
  [../devops-deployment/database-migrations.md](../devops-deployment/database-migrations.md)
  settled on Drizzle.
- [project-license-selection.md](./project-license-selection.md) — Decided.
  **Apache-2.0.** Confirmed Garage's AGPLv3 doesn't reach this project's
  own code (no modification, no plugin model touching its internals).
  Chosen over MIT for the patent grant and consistency with 4 of the
  project's own Apache-2.0 dependencies (Zero, GROBID, Caddy, Sysbox);
  copyleft ruled out as unfit for a personal blog/portfolio site.
- [third-party-attribution-requirements.md](./third-party-attribution-requirements.md) —
  Decided. Only one real obligation: a Semantic Scholar text credit/link
  in the Lit Tracker UI wherever S2-sourced data is shown. GROBID
  (self-hosted, unmodified, Apache-2.0) and the chosen fonts/icons
  (JetBrains Mono/SIL OFL, Lucide/MIT) impose no UI-facing requirement,
  just standard license-file hygiene.
- [blog-and-content-licensing.md](./blog-and-content-licensing.md) —
  Decided. **CC BY 4.0**, separate from the Apache-2.0 code license —
  software licenses are a mismatched tool for prose (same split OSI's own
  site uses). Chosen over all-rights-reserved, CC BY-NC, and CC0 as the
  user's preference: freely reusable with attribution.
