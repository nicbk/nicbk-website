# Testing: User-Settings Modal

Auth-requiring tests **inject a session** (cookie / Playwright `storageState`)
per
[mocking-external-services.md](../../../../research/testing-qa/mocking-external-services.md);
delete/log-out are verified against the real backend at the integration tier.

## Unit (Vitest + Testing Library)

- **Modal** renders the account email (display only) and no editable fields.
- **Confirmation-match predicate:** returns false until the typed text exactly
  matches the required prompt (email), then true; whitespace/case mismatches do
  not match.
- **Delete gating:** the "delete account" action stays **disabled** until the
  confirmation field's text exactly matches, then enables; confirming invokes the
  delete handler. "Log out" invokes the sign-out handler.
- **Accessibility behavior:** focus is trapped in the open modal and restored to
  the trigger on close; Escape dismisses; the modal exposes an accessible name.

## Integration (Vitest + Testcontainers Postgres)

- **Log out** invalidates the session server-side (a subsequent read with the
  old session is unauthenticated).
- **Delete account** removes the identity rows for the user; a session for the
  deleted user no longer resolves. (No sub-app tables exist yet, so nothing
  downstream cascades.)

## End-to-end (Playwright, injected session)

- With a session injected via `storageState`, the modal shows the account email;
  **log out** ends the session; the **delete** type-to-confirm flow fires only
  after the exact-match confirmation.
- **Theming:** the open modal is correct in both themes, no flash of the wrong
  theme.

## Accessibility

- `@axe-core/playwright` inline on the open modal passes (critical/serious) in
  both themes; the destructive control, confirmation field, and dismiss control
  are keyboard operable with discernible names.

## Not tested here

- A **live avatar trigger** in a real header (deferred to #7 — the modal is
  rendered via a test harness here).
- Cascading deletion of user-owned sub-app data (no such tables until #7).
- The sign-in page / route-guard (task 2) and backend config (task 1).
