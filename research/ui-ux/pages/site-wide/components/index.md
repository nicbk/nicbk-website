# Site-wide Components

Status: 3/3 decided (search-input added 2026-07-17).

Components used across [../pages/index.md](../pages/index.md)'s standalone
routes, rather than routes of their own. See [../index.md](../index.md) for
the pages-vs-components split rationale.

- [header.md](./header.md) — Decided. Sticky site header, distinct from
  the lit tracker's own header.
- [user-settings.md](./user-settings.md) — Decided. Centered modal for
  account email display, log out, and delete account.
- [search-input.md](./search-input.md) — Decided. The shared rounded-pill
  search field (Base UI `Field` + `Input`), reused by the blog index and the
  lit-tracker collection view.
