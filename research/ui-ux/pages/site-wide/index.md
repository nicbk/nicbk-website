# Site-wide Pages & Components

Status: all decided (2026-07-04) — see [pages/index.md](./pages/index.md)
and [components/index.md](./components/index.md) for per-item status.

Pages used across the personal site, plus auth/account surfaces shared by
any sub-application that needs them (not owned by the lit tracker
specifically — see [../lit-tracker/index.md](../lit-tracker/index.md) for
that). See [../index.md](../index.md) for mockups on file and
page-list-wide decisions (access-denied handling, generic error fallback
existence, header split).

Split into two subfolders, mirroring
[../lit-tracker/index.md](../lit-tracker/index.md)'s pages/components
split, per [AGENTS.md](../../../../AGENTS.md)'s "Manage complexity through
folder structure" guidance:

- [pages/index.md](./pages/index.md) — standalone routes (home, about,
  projects, blog list, blog post, not-found, error fallback, sign-in).
- [components/index.md](./components/index.md) — components used by those
  pages, not routes of their own (header, user settings modal).
