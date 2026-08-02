# Task: Lit Tracker Shell

Second of five. The first page of the Lit Tracker, and the first place Zero's
reactivity is visible in a browser.

## What this task does

- **Creates the `/lit-tracker` route group** — its own top-level group, not
  part of `(personal-site)`, because the Lit Tracker uses a different shell
  entirely.
- **Attaches `requireAuth` to it.** This is the guard's **first live
  attachment**: #6 built and tested it in isolation because no protected route
  existed. A signed-out visitor is redirected straight to `/sign-in` carrying
  the requested URL, with no interstitial.
- **Builds the lit-tracker header and its sidebar rail** — the header a
  separate component from the site header, not a variant of it: the app name on
  the left linking to the tracker root, and on the right a breadcrumb-style
  path indicator showing just the root segment (`↳/nicbk_home`, a link to the
  **personal site's** home) followed by the site's theme toggle — the same
  left/right split the site header uses.

  **Revision (2026-08-02), decided with the user:** the account avatar is at the
  **foot of the sidebar**, not on the far right of the header — which is where
  the sample mockup actually puts it, and which the original wording misread. It
  shows the **Google account's own picture**, falling back to a letter when
  there is none or the request fails. It opens the **existing shared
  user-settings modal** from #6 either way — that is the modal's **first live
  trigger**, closing the second loop #6 left open. The rail it sits in is the
  same one #8 fills with the tag and reading-status filters; this task builds it
  near-empty so the app shell has both of its panels.
- **Implements the fixed app-shell layout** the header spec calls for: the
  header's height is reserved at the top of the viewport and is not part of the
  scrolling document; content below scrolls in independent bounded panels. This
  is materially different from the site header's `position: sticky` on a
  normally-scrolling page, and is the layout every later Lit Tracker page
  inherits.
- **Wires the Zero client** — the provider and the connection to `zero-cache`.
  Two things task 1 established that this one inherits: the credential is the
  **Better Auth session cookie**, which zero-cache forwards to `/query` (not a
  token), and Zero **does not support SSR**, so the provider must be loaded
  client-only — `React.lazy` is TanStack Start's documented way.
- **Makes cookie auth work in production.** For the browser to send its session
  cookie to zero-cache, the two have to be same-site. Locally this needs nothing
  — browsers key cookies by host, not port — which is why task 1 left it:
  nothing connected yet.

  **Revision (2026-08-02), agreed with the user:** this is done by serving
  zero-cache **same-origin at `https://nicbk.com/zero`**, not from a
  `zero.nicbk.com` subdomain as originally written. zero-cache's router accepts
  an optional leading base path segment and Zero's client permits at most one,
  so nginx proxies `/zero/` straight through. That leaves the auth
  configuration untouched: the subdomain route would have needed
  `crossSubDomainCookies`, which widens the session cookie to every subdomain of
  the site permanently, plus a DNS record and a certificate — all to buy nothing
  this task needs. So the production change is **one nginx `location` block**,
  not a server block and an auth-config change.
- **Renders a minimal collection surface**: one live `useQuery` over `articles`,
  showing the plain inline empty-state text when there are none, and a plain
  list of titles and authors when there are. No cards, no tags, no filtering, no
  search, no infinite scroll — those are #8.
- **Links the projects page to it.** `ProjectsPage`'s Literature Tracker entry
  is deliberately unlinked today, with a comment saying the tracker "has no
  route, and has no decided URL" — both of which stop being true here. The
  `projects-page` feature already assigned this follow-up to "the feature that
  builds the tracker", so this task turns that entry into a link to
  `/lit-tracker` and updates the comment.

## Why this shape

Task 1 deliberately has nothing to look at, and this project's guidance is
explicit that a feature is verified by exercising it in a browser, not by tests
alone. This task is the smallest thing that makes the sync foundation
observable: insert a row in Postgres, watch it appear on screen without a
refresh.

It also gets the two dangling pieces from #6 — the route guard and the settings
modal — into live use at the first opportunity, rather than leaving them
covered only by isolation tests for another three PRs.

## Deliberately minimal, but not throwaway

The plain list this task renders is the host surface #8 upgrades. #8 replaces
the list with the card grid and builds the tag/status sidebar and search around
it; the route, the guard, the header, the app-shell layout, and the Zero
provider all stay. Nothing here is written to be deleted.

## Not in this task

Uploading anything. There is no "+" button and no status indicator yet — those
arrive in task 3 with the storage path that makes them mean something. The full
collection view is #8.
