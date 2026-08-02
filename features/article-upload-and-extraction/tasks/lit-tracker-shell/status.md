# Status: Lit Tracker Shell

**State:** In review — [PR #74](https://github.com/nicbk/nicbk-website/pull/74)
open, CI green on all five jobs. Second of five.

- Branch: `article-upload-and-extraction/lit-tracker-shell`.
- Sub-issue: [#68](https://github.com/nicbk/nicbk-website/issues/68)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  self-assigned.
- PR: [#74](https://github.com/nicbk/nicbk-website/pull/74).

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
- **`LitTrackerHeader`** — app name linking to the tracker root on the left;
  the `↳/nicbk_home` path and the site's theme toggle grouped on the right,
  mirroring the site header's left/right split. It takes no props at all.
- **`LitTrackerSidebar`** — the left rail, with the account avatar pinned to its
  foot. Near-empty above that today; #8 fills it with the tag and
  reading-status filters.
- **`AccountAvatar`** — the Google account's own picture, falling back to a
  letter when there is none or the third-party request fails, opening the
  **shared** user-settings modal. That is the modal's first live trigger,
  closing the second loop #6 left open.
- **`LitTrackerShell`** — the fixed app-shell layout: one viewport tall, header
  row sized to content, and below it two independently scrolling panels — the
  rail and the content. It carries the same `<main id="main-content"
  tabIndex={-1}>` landmark SiteShell does, for the skip link and the
  route-change focus handoff.
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
- **`/user-settings-probe` deleted.** It existed only until the tracker
  supplied a real trigger; `e2e-auth/user-settings.spec.ts` now runs against
  `/lit-tracker`, so the modal is exercised on a real page rather than beside
  one.

## Decisions taken during implementation

- **zero-cache is served same-origin at `https://nicbk.com/zero`, not from a
  `zero.nicbk.com` subdomain** — agreed with the user, and a reversal of what
  task 1 recorded. zero-cache's router accepts an optional leading base path
  segment (`(/:base)/:worker/v:version/:action`) and Zero's client permits at
  most one, so Caddy can proxy `/zero/*` through untouched. Same-origin means
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
- **The account control lives at the foot of the sidebar, and the theme toggle
  joined the header** — both decided by the user during review, and both
  recorded as a dated revision in
  [header.md](../../../../research/ui-ux/pages/lit-tracker/components/header.md).
  The mockup does put the avatar bottom-left, in the rail, which the original
  spec wording read as a header item. The toggle closes what would otherwise
  have been the one part of the site with no way to change theme — a gap created
  by giving each sub-application its own header, so it applies to every later
  one too.
- **The avatar shows the Google profile picture, with the letter as its resting
  state.** `user.image` is nullable, and even when present it is a third-party
  URL that content blockers routinely stop and that Google's CDN rate-limits. So
  the letter is not a lesser fallback bolted on afterwards — it is what renders
  first, with the picture layered over it once one loads, and an `onError`
  switching back rather than leaving a broken-image glyph. `referrerPolicy="no-referrer"`
  keeps the current URL from travelling to Google: which article a reader is
  looking at is not Google's business.
- **The breadcrumb's root segment names the site, not the reader.** `nicbk_home`
  is literal and identical for every account, and links to the *personal site's*
  home — not back to the tracker, which is what the app name on the left is for.
  Corrected by the user in review after a first attempt derived a per-account
  handle from the email; that reading also made the header need the session,
  which it now does not. The path runs from the site's home outwards, which is
  what makes #9's `↳/nicbk_home/Article A/Article B` coherent.
- **The rail sizes to its contents rather than taking a fixed share of the
  width.** Today that is one avatar, so it reads as a slim strip holding one
  control; a fixed percentage would look like a broken empty column until #8
  puts filters in it, and would then need changing again.
- **`allowedHosts` in `vite.config.ts`.** Found by the e2e, not by reading:
  zero-cache resolves every query by calling back into this app *from inside a
  container*, and Vite's dev server rejects the resulting `Host` header. Two
  names are allowed — `app` (the Compose service) and `host.docker.internal`
  (the gateway, used by the e2e tier). Dev-server-only; nothing about the
  production server changes.

## Log addendum — layout revised in review (2026-08-02)

The user reviewed the running page and moved two controls, which is recorded
above and in
[header.md](../../../../research/ui-ux/pages/lit-tracker/components/header.md):
the account avatar to the foot of a sidebar rail (where the mockup has it, and
showing the Google account's own picture), and the site's theme toggle into the
header at its far end. The `↳/…_home` breadcrumb segment became a link.

A second round moved the path to the right of the row, immediately left of the
toggle, and corrected what it *means*: `nicbk_home` is the site owner's name,
constant across accounts, linking to the personal site's home — not a handle
derived from the signed-in reader, and not a second way back to the tracker
root. The derivation and its tests were deleted outright, and the header now
takes no props.

Two things worth carrying:

- **The mockup was right and the prose describing it was not.** The decided
  header doc listed the avatar as a header item; the image it cites puts it
  bottom-left in the sidebar. Reading the artifact rather than only the summary
  of it would have caught that before implementation.
- **An example in a spec is not a template.** `↳/nicbk_home` was written as
  "e.g." and read as a pattern to fill in per account, when it was the literal
  string. Where a doc gives one concrete example of a value, it is worth asking
  which parts of it vary — the answer here was "none of it".

## Verification

- Unit: 359 tests overall (59 new across the header, the breadcrumb helper, the
  shell, the sidebar's account avatar and its letter fallback, the collection
  surface, the author formatting, the cache-url guard, both route mounts, and
  the client-only boundary). Line coverage above main's 76.05% baseline.
- The client-only boundary is asserted with the **real server renderer**
  (`renderToString`), not just in jsdom: Zero has no SSR support, and a
  regression there is a server render that throws rather than something a
  component test would notice.
- Integration: unchanged, 25 tests still passing. This task adds no server
  surface.
- E2e (ordinary suite): 61/61 in production mode.
- E2e (signed-in tier): **20/20, against both the dev server and the production
  build.** The tier now brings up a real zero-cache beside its Postgres, so the
  live-sync test inserts a row into Postgres with the page open and waits for it
  in the DOM — the first coverage anywhere in this project of the whole reactive
  path.
- **Browser verification** on the local Compose stack, signed in: the guard
  redirect with no interstitial; the header, breadcrumb, and avatar; live sync
  watched directly (three rows inserted straight into Postgres appeared with no
  reload, a **second account's row did not**, and deleting them emptied the list
  live); the app shell holding — panel `scrollTop` 3444 while the document
  stayed at 0 and the header did not move; both themes, switched with the
  tracker's own toggle; the real Google profile picture rendering in the rail's
  avatar; and the avatar → modal round trip driven entirely by keyboard, with
  focus returning to the avatar on Escape. Chrome will not size a window below a 500px viewport, so the 360px
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
  does not treat them alike.** Opened as
  [PR #74](https://github.com/nicbk/nicbk-website/pull/74); **CI green on all
  five jobs first time**, including the signed-in tier's new zero-cache
  container on GitHub-hosted Linux — the one part of this that could not be
  proven locally, since `host-gateway` behaves differently on macOS.

## Before this merges

`VITE_ZERO_CACHE_URL=https://nicbk.com/zero` must be in
`/var/lib/nicbk-website/.env` on nicbk-tower, and the Caddy `handle /zero/*`
block (README step 5) in place. Compose interpolates the variable at **build**
time with `:?`, so a missing value fails the build with a named error rather
than shipping a client that silently syncs nothing.
