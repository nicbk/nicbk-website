# Testing: Sign-in Page and Route Guard

External-service stubbing per
[mocking-external-services.md](../../../../research/testing-qa/mocking-external-services.md):
the login-flow e2e stubs Google's OAuth endpoints via WireMock/MockServer;
other auth-requiring tests inject a session.

## Unit (Vitest + Testing Library)

- **Route-guard:** a signed-out context yields a redirect to `/sign-in` carrying
  the current URL as the return-to target; a signed-in context permits the
  route. Tested as a pure function over an injected session/context.
- **Return-to helper:** encodes/decodes a same-origin app path round-trip;
  **rejects** an external/absolute URL (no open redirect), falling back to a safe
  default.
- **Sign-in page** renders the explanatory line and the "sign in with Google"
  button (with an accessible name); an injected error state renders the inline
  error message (programmatically associated), not a toast.
- Exactly one main heading is present (focus-handoff target).

## End-to-end (Playwright)

- **Login flow (the one stubbed-Google test):** with Google's
  `/authorize`·`/token`·`/userinfo` stubbed via the mock-server container,
  clicking "sign in with Google" completes the round-trip, sets the session
  cookie, and **redirects back to the return-to URL** carried into the flow.
- **Sign-in error:** a stubbed failed/cancelled Google response renders the
  inline error on `/sign-in` and sets no session cookie.
- **Metadata:** `/sign-in` exposes the expected `<title>` and
  `meta name="description"`.
- **Theming:** no flash of the wrong theme; correct in both themes.

## Accessibility

- `@axe-core/playwright` inline on `/sign-in` passes (critical/serious) in both
  themes; the Google button and inline error are keyboard-reachable and
  announced; contrast and focus indicators meet AA in both themes.

## Not tested here

- The **guard attached to a live protected route** (no such route until #7).
- The **user-settings modal** and log-out/delete (task 3).
- Backend session lifecycle / migrations (covered by task 1's integration tier).
