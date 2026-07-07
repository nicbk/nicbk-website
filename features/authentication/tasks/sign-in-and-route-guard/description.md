# Task: Sign-in Page and Route Guard

Build the one surface that exercises the whole OAuth flow end-to-end — the
`/sign-in` page — and the reusable route-guard utility that redirects
signed-out users to it. Depends on `auth-backend-and-config` (the Better Auth
instance, the `/api/auth/*` mount, and the server-side session-read helper).

## What this task does — concretely

- **Sign-in page.** Add `src/routes/(personal-site)/sign-in.tsx` (or the
  equivalent standalone route) rendering inside the **site header**, per
  [sign-in.md](../../../../research/ui-ux/pages/site-wide/pages/sign-in.md):
  - a short explanatory line of why sign-in is needed,
  - a **"sign in with Google"** button that initiates Better Auth's Google
    OAuth flow,
  - an **inline error message** on failure/cancellation (consistent with the
    inline-form-error convention in
    [design-system.md](../../../../research/ui-ux/design-system.md), not a
    toast),
  - a per-page **`head()`** setting `<title>` + `meta name="description"`,
  - a colocated `-components/sign-in-page/` component + CSS Module styled from
    tokens.
- **Redirect-back.** Carry the originally-requested URL through the flow (read
  from a search param / return-to value) so that on success the user is
  redirected back to where they came from, not a fixed destination. Include the
  small pure helper that encodes/decodes and safely validates that return-to
  target (only same-origin app paths).
- **Reusable route-guard.** Add a reusable guard utility (e.g.
  `src/auth/require-auth.ts`) that, given a request/route context, resolves the
  session via task 1's helper and — when signed out — **redirects to `/sign-in`
  with the current URL as the return-to target** (no interstitial page, per
  [`research/ui-ux/pages/index.md`](../../../../research/ui-ux/pages/index.md)).
  Built to be dropped into a route's `beforeLoad`/loader unchanged by #7's
  protected Lit-Tracker routes.

## Not in this task

- **Attaching the guard to a live protected route** — none exists until #7; the
  guard is shipped as a tested utility, not wired to a personal-site route (the
  personal site has no protected pages, and its header carries no auth UI).
- The **user-settings modal** and log-out/delete actions (task 3).
- The Postgres/Drizzle/Better Auth backend and env config (task 1).
