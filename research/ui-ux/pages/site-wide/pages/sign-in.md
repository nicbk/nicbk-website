# Sign-in Entry Point

Status: Decided 2026-07-02.

The "sign in with Google" action; shared across every sub-application that
needs auth (see
[../../../../technologies/auth.md](../../../../technologies/auth.md)), not
specific to the lit tracker. Any future sub-application requiring auth
reuses this same page rather than each building its own.

- **Layout**: minimal standalone page — site header, a short explanatory
  line of why sign-in is needed, and a "sign in with Google" button.
- **Post-sign-in redirect**: back to whatever protected URL the user
  originally tried to access (not a fixed destination like the lit
  tracker's home) — keeps this page agnostic to which sub-application sent
  the user here. Also see "Access-denied handling" in
  [../../index.md](../../index.md) — a signed-out user hitting a protected
  lit-tracker URL is redirected straight here.
- **Error handling**: if Google sign-in fails or is cancelled, the error is
  shown as an inline message on this same page, consistent with the
  inline-form-error convention in
  [../../../design-system.md](../../../design-system.md)'s "Reactive UI feedback
  patterns" topic (not a toast, since this is a form-like interaction).

Uses the [site header](../components/header.md).
