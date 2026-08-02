# Constraints and Behavior: Lit Tracker Shell

Which of the feature's acceptance criteria
([../../constraints-and-behavior.md](../../constraints-and-behavior.md)) this
task satisfies.

## Satisfied here

**From "Routes and shell" — all of it:**

- The Lit Tracker lives at **`/lit-tracker`**, its own top-level route group,
  not using the `(personal-site)` shell.
- Every `/lit-tracker` route is behind **`requireAuth`**: a signed-out visitor
  is redirected to `/sign-in` carrying the requested URL, with **no
  access-denied interstitial**.
- The **lit-tracker header** is a separate component from the site header: app
  name on the left linking to the tracker root, and — per the 2026-08-02
  revision agreed with the user — a breadcrumb path indicator on the right whose
  root segment (`nicbk_home`, literal for every account) links to the personal
  site's home, followed by the site's theme toggle at the far end. The account avatar opening the
  **existing shared user-settings modal** sits at the foot of the sidebar rail
  instead, where the sample mockup puts it, and shows the Google account's own
  picture with a lettered fallback.
- The header uses the **fixed app-shell layout** — reserved height at the top
  of the viewport, not part of the scrolling document, with content below
  scrolling in independent bounded panels.

**Inherited follow-up from `projects-page`:**

- The projects page's Literature Tracker entry becomes a **link to
  `/lit-tracker`**, and the comment stating the tracker "has no route, and has
  no decided URL" is updated. That feature explicitly deferred this to whichever
  feature builds the tracker; this is that point.

**Partially, from "Sync engine and services" / "Authorization and data
isolation":**

- The Zero **client** connects to `zero-cache` and carries the auth token
  `/query` validates, completing the path task 1 built the server half of.

**From "Upload status indicator" — one item only:**

- The **empty collection** state renders as plain inline text, per the decided
  reactive-feedback default (no illustration).

**From "Cross-cutting quality":**

- WCAG 2.2 AA on this page: the header's app-name link and avatar have
  discernible accessible names, focus indicators are visible in both themes,
  contrast meets AA, and the heading structure is valid with a main heading the
  shell's client-navigation focus handoff can target.
- Correct in both themes with no flash of the wrong theme, and at narrow, mid,
  and wide widths — the app-shell layout's independently scrolling panels are
  exactly the kind of thing that breaks at one width only.
- CI passes.

## Explicitly not satisfied here

- **Everything under "Upload flow", "Upload status indicator" (beyond the empty
  state), and "Extraction pipeline"** — tasks 3, 4, and 5.
- **The full collection view** — card grid, user-defined tags, reading-status
  filter sidebar, live search, infinite scroll. That is #8, which upgrades this
  surface.
- **Any write path.** This page reads; nothing on it mutates anything.

## Exit state

A signed-in user opens `/lit-tracker`, sees the header with a working avatar
that opens the settings modal, and sees the empty-state text. A signed-out
visitor is bounced to `/sign-in` and returns here after signing in. A row
inserted directly into Postgres for that user **appears on screen without a
refresh** — the first live proof that the site is reactive.
