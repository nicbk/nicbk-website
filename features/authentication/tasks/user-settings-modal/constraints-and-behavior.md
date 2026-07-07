# Constraints and Behavior: User-Settings Modal

Satisfies these feature-level acceptance criteria (from
[../../constraints-and-behavior.md](../../constraints-and-behavior.md) — the
"User-settings modal" section plus the cross-cutting quality bar):

## Modal

- A **centered modal** (Base UI dialog) shows the signed-in Google account
  **email, display only** — no editable fields.
- **Log out** ends the session (clearing the hardened cookie) and returns a
  signed-out state.
- **Delete account** requires an inline confirmation where the user must type
  text that **exactly matches** a given prompt (their email) before the action
  is enabled/submitted — not a native `confirm()`. On confirm it removes the
  identity rows for the user; a session for the deleted user no longer resolves.
- The modal is built as a **reusable component**; its live avatar trigger is
  deferred to #7. It is rendered/tested in isolation here.

## Accessibility

- The open modal **traps focus** and **restores** it to the trigger on close; it
  is **keyboard-dismissible** (Escape) and has an accessible name.
- The destructive "delete account" control and the confirmation field have
  discernible accessible names; the disabled→enabled transition of the delete
  action is conveyed to assistive tech.
- Contrast and focus indicators meet WCAG 2.2 AA in both themes.

## Cross-cutting quality

- Correct in both light and dark themes, no flash of the wrong theme.
- Runs identically via `npm run dev`, the production Nitro server, and
  `docker compose up`.
- CI passes, including component + integration tests (injected session) and
  inline axe on the open modal.

## Dependencies

- The server-side session-read helper and Better Auth's sign-out/delete-user
  endpoints from `auth-backend-and-config` (task 1).
- The Base UI dialog primitive, design tokens, theming, and focus conventions
  from [`app-shell-and-home`](../../../app-shell-and-home/description.md).

## Provides to later work

- The reusable `<UserSettings>` modal — #7's Lit-Tracker header supplies its
  live avatar trigger and mounts it in-app.
