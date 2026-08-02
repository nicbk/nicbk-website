# Status: Lit Tracker Shell

**State:** Implemented — awaiting PR + CI + review. Second of five.

- Branch: `article-upload-and-extraction/lit-tracker-shell`.
- Sub-issue: [#68](https://github.com/nicbk/nicbk-website/issues/68)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  self-assigned.
- PR: —

## Notes carried into implementation

- **The header is a separate component, not a variant of the site header** —
  the decided spec is explicit, and the layout models genuinely differ (fixed
  app shell vs. sticky header on a scrolling page). Do not try to
  parameterize one component into both.
- **Reuse, do not rebuild.** `requireAuth` and the user-settings modal already
  exist, tested, from #6; this task wires them, it does not reimplement them.
  Its docstring even names this route pattern as the intended use.
- **The plain list is a host surface, not a placeholder.** #8 upgrades it in
  place; write it to be replaced cleanly, not thrown away.
- **Separated type imports matter here specifically.** This is a protected
  route naming server-only types — the exact shape that leaked server modules
  into the client bundle in #6's task 3. Verify the built client bundle carries
  no server-only module, the way that bug was caught.
- **Verify in the browser before the PR.** Both themes, three widths, panel
  scrolling, keyboard-driven avatar → modal, and live sync watched directly.
  Tests alone have missed layout and bundle bugs on this project twice.

## What was built

- **`/lit-tracker`, its own top-level route group**, with `requireAuth`
  attached at the group root so every page added later inherits it. It is the
  guard's first attachment to a page a visitor can reach.
- **`LitTrackerHeader`** — app name linking to the tracker root, the
  `↳/…_home` breadcrumb, and the avatar that opens the **shared** user-settings
  modal. That is the modal's first live trigger, closing the second loop #6
  left open.
- **`LitTrackerShell`** — the fixed app-shell layout: one viewport tall, header
  row sized to content, a single bounded row below it that scrolls itself. It
  carries the same `<main id="main-content" tabIndex={-1}>` landmark SiteShell
  does, for the skip link and the route-change focus handoff.
- **The Zero client**, behind `React.lazy` inside TanStack Router's
  `ClientOnly`, mounted once at the group layout so there is one WebSocket per
  session rather than one per page.
- **The collection surface** — one live `useQuery(queries.articles.mine())`,
  rendering a plain list of titles and authors, the plain inline empty-state
  text, or the cold-load placeholder.
- **`TrackerLoading`** — one placeholder for the two moments a reader cannot
  tell apart: before hydration, and while the first sync is in flight.
- **The projects page's Literature Tracker entry is now a link**, which is the
  follow-up `projects-page` explicitly deferred to whichever feature built the
  tracker.
- **`/user-settings-probe` deleted.** It existed only until this header
  supplied a real trigger; `e2e-auth/user-settings.spec.ts` now runs against
  `/lit-tracker`, so the modal is exercised on a real page rather than beside
  one.

## Decisions taken during implementation

- **zero-cache is served same-origin at `https://nicbk.com/zero`, not from a
  `zero.nicbk.com` subdomain** — agreed with the user, and a reversal of what
  task 1 recorded. zero-cache's router accepts an optional leading base path
  segment (`(/:base)/:worker/v:version/:action`) and Zero's client permits at
  most one, so nginx can proxy `/zero/` through untouched. Same-origin means
  the browser sends the session cookie with **no change to how that cookie is
  issued**; the subdomain route would have required `crossSubDomainCookies`,
  widening the session cookie to every subdomain of the site permanently, plus
  a DNS record and a certificate. Recorded in
  [research.md](../../research.md) and
  [description.md](./description.md).
- **`VITE_ZERO_CACHE_URL` is the project's first and only `VITE_`-prefixed
  variable.** The browser opens that WebSocket itself, so the address is public
  by construction — the "genuinely public value" case
  [secrets-and-environment-config.md](../../../../research/devops-deployment/secrets-and-environment-config.md)
  anticipates. Vite inlines it at build time, so it travels as a Docker build
  arg rather than through `env_file`.
- **The collection distinguishes *syncing* from *empty*.** Zero reports a
  result type per query, and an account whose first sync has not landed and an
  account with nothing in it are the same empty array. Rendering "no articles
  yet." during the first sync would be a lie that looks exactly like data loss.
- **A failed query renders inline, not as a toast.** The decided pattern for an
  error outside a form context is a dismissible toast, and no toast component
  exists on this site. Building one to carry a single message would be a
  site-wide component decided by a lit-tracker detail; #8 is where one would
  take this over. The alternative — leaving the error unhandled — reads on
  screen as an empty collection, which is worse.
- **The breadcrumb's root segment and the avatar's letter are derived, not
  stored.** There is no username column anywhere in the schema, and adding one
  to render two pieces of chrome would be a data-model decision made for a
  styling reason. Both are pure functions over the account, so a real handle
  later turns them into lookups and nothing else moves. The avatar is a letter
  rather than the Google profile picture: that would be a third-party CDN
  request on every page load of a signed-in session, and would need a fallback
  for a missing image regardless — so the fallback is simply the design, which
  is also what the sample mockup shows.
- **`allowedHosts` in `vite.config.ts`.** Found by the e2e, not by reading:
  zero-cache resolves every query by calling back into this app *from inside a
  container*, and Vite's dev server rejects the resulting `Host` header. Two
  names are allowed — `app` (the Compose service) and `host.docker.internal`
  (the gateway, used by the e2e tier). Dev-server-only; nothing about the
  production server changes.

## Open, not resolved here

- **The tracker has no theme toggle.** The decided header spec lists exactly
  three things — app name, breadcrumb, avatar — and the theming decision places
  the toggle on the site-wide header surface, so none was added. The stored
  choice is site-wide and persists, so a reader can still change it from the
  personal site; but from inside the tracker there is no way to. Raised with
  the user; left as the spec has it rather than deviating silently.

## Verification

- Unit: 356 tests overall (56 new across the header, its identity helpers, the
  shell, the collection surface, the author formatting, the cache-url guard,
  both route mounts, and the client-only boundary). Line coverage 80.54%, up
  from main's 76.05%.
- The client-only boundary is asserted with the **real server renderer**
  (`renderToString`), not just in jsdom: Zero has no SSR support, and a
  regression there is a server render that throws rather than something a
  component test would notice.
- Integration: unchanged, 25 tests still passing. This task adds no server
  surface.
- E2e (ordinary suite): 61/61 in production mode.
- E2e (signed-in tier): **19/19, against both the dev server and the production
  build.** The tier now brings up a real zero-cache beside its Postgres, so the
  live-sync test inserts a row into Postgres with the page open and waits for it
  in the DOM — the first coverage anywhere in this project of the whole reactive
  path.
- **Browser verification** on the local Compose stack, signed in: the guard
  redirect with no interstitial; the header, breadcrumb, and avatar; live sync
  watched directly (three rows inserted straight into Postgres appeared with no
  reload, a **second account's row did not**, and deleting them emptied the list
  live); the app shell holding — panel `scrollTop` 3444 while the document
  stayed at 0 and the header did not move; both themes; and the avatar → modal
  round trip driven entirely by keyboard, with focus returning to the avatar on
  Escape. Chrome will not size a window below a 500px viewport, so the 360px
  case is covered by the e2e assertion rather than by eye.
- Bundle: Zero is in a route-split chunk loaded only on `/lit-tracker` — the
  entry statically imports neither it nor the tracker's page chunk — and the
  client build carries no `drizzle-orm`, Better Auth adapter, or `node:crypto`.

## Log

- 2026-08-01 — Task defined during the feature spec. Second of five; not yet
  started.
- 2026-08-02 — Implemented. Two things settled with the user before writing
  code: serving zero-cache same-origin rather than from a subdomain (see
  above), and retiring `/user-settings-probe` now that a real trigger exists.
  One finding came out of the e2e rather than out of research — Vite's dev
  server blocks the `Host` zero-cache calls back with, which presents as a
  collection stuck on its loading placeholder and looks like a Zero fault. The
  general shape worth carrying: **a service that calls back into this app from
  inside a container is a different client than a browser, and the dev server
  does not treat them alike.**
