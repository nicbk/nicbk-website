# Task: User-Settings Modal

Build the site-wide account-settings surface: a centered modal showing the
signed-in Google account email, with log-out and a guarded delete-account
action. Depends on `auth-backend-and-config` (the session-read helper and
Better Auth's sign-out/delete endpoints).

## What this task does — concretely

- **Modal component.** Add a reusable `<UserSettings>` component (colocated
  under the site-wide shared components, e.g.
  `src/routes/-shared/components/user-settings/`) — a **centered modal** built
  on the project's Base UI dialog primitive, styled from tokens, per
  [user-settings.md](../../../../research/ui-ux/pages/site-wide/components/user-settings.md).
- **Content (read-only).** Display the signed-in Google account **email only**
  (no editable fields — the mockup's "S3 Bucket URL" is a dropped placeholder).
- **Log out.** A "log out" action that ends the session via Better Auth
  (clearing the hardened cookie) and returns the user to a signed-out state.
- **Delete account (guarded).** A "delete account" action gated by an **inline
  type-to-match confirmation**: the user must type text that **exactly matches**
  a given prompt (their email) before the destructive action is
  enabled/submitted — **not** a native `confirm()`. On confirm, it calls Better
  Auth's delete-user path, removing the identity rows. Include the small pure
  **match predicate** as a testable helper.
- **Accessibility.** Focus is trapped within the open modal and **restored** to
  the trigger on close; the modal is dismissible by keyboard (Escape) and has an
  accessible name; the destructive action and confirmation field have discernible
  names and states.

## Not in this task

- The **live avatar/icon trigger** — it lives in the (future) Lit-Tracker header
  and is wired in #7. This task builds and tests the modal in isolation
  (rendered directly / behind a test harness trigger), since the personal-site
  header carries no auth UI.
- Any **cascade of user-owned data** on delete — no such tables exist until #7;
  deletion here removes only the identity rows (see the feature's
  [research.md](../../research.md)).
- The sign-in page, route-guard (task 2), and the backend/config (task 1).
