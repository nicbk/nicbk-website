# Constraints and Behavior: Sign-in Page and Route Guard

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md) — the
"Sign-in page", "Route guard", "Metadata", and cross-cutting quality sections):

## Sign-in page

- `/sign-in` renders inside the site header with a short "why sign in" line and
  a **"sign in with Google"** button that initiates Better Auth's Google flow.
- On success the user is **redirected back to the originally-requested URL**
  carried into the flow (a validated same-origin app path), not a fixed
  destination.
- On failure/cancellation an **inline error** is shown on the same page (not a
  toast); no session cookie is set.
- The route sets its own `<title>` and `meta name="description"`.
- Valid heading structure with a main heading the shell's client-navigation
  focus handoff can target.

## Route guard

- The reusable guard, given a **signed-out** context, redirects to `/sign-in`
  with the current URL preserved as the return-to target; given a **signed-in**
  context it permits the route. No interstitial "access denied" page.
- The return-to target is validated to be a **same-origin app path** (no
  open-redirect to an external URL).
- The guard is a reusable utility verified in isolation; it is **not** attached
  to a live protected route in this task (first live use is #7).

## Cross-cutting quality

- WCAG 2.2 AA: the Google button has a discernible accessible name and visible
  focus indicator; the inline error is programmatically associated and
  announced; contrast meets AA in both themes.
- Correct in both light and dark themes, no flash of the wrong theme.
- Runs identically via `npm run dev`, the production Nitro server, and
  `docker compose up`.
- CI passes, including the login-flow e2e (stubbed Google) and inline axe.

## Dependencies

- The Better Auth instance, `/api/auth/*` mount, and server-side session-read
  helper from `auth-backend-and-config` (task 1).
- The site header, design tokens, theming, and focus handoff from
  [`app-shell-and-home`](../../../app-shell-and-home/description.md).

## Provides to later work

- The reusable **route-guard** (`require-auth`) and the **return-to**
  encode/decode/validate helper — consumed by #7's protected Lit-Tracker routes,
  which supply the first live attachment.
