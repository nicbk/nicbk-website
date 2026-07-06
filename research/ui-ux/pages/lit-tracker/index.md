# Lit-tracker Pages & Components

Status: all decided (2026-07-04) — see [pages/index.md](./pages/index.md)
and [components/index.md](./components/index.md) for per-item status.

Literature Tracker sub-application pages and components. Uses the shared
sign-in entry point and user settings interface from
[../site-wide/index.md](../site-wide/index.md) rather than defining its
own. See [../index.md](../index.md) for mockups on file and
page-list-wide decisions (access-denied handling, generic error fallback
existence, header split).

Split into two subfolders, mirroring the top-level
[site-wide](../site-wide/index.md)/[lit-tracker](./index.md) split, per
[AGENTS.md](../../../../AGENTS.md)'s "Manage complexity through folder
structure" guidance — as the lit-tracker discussion progressed, it became
clear "page" was covering two distinct things worth separating:

- [pages/index.md](./pages/index.md) — standalone routes (collection view,
  article detail).
- [components/index.md](./components/index.md) — modals and embedded
  main-content/sidebar views used by those pages (header, upload flow,
  upload status, article edit, citation graph, reader/annotation).
