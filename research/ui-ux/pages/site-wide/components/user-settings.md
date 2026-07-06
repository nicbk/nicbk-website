# User Settings Interface

Status: Decided 2026-07-02.

Minimal for now: signed-in Google account email (display only), log out,
delete account. Shared/site-wide — account settings aren't a lit-tracker
concept, they're a site-wide account concept the lit tracker (and future
sub-apps) links into.

- **Presentation**: a centered modal (same pattern as
  [../../../sample-mockups/popup.png](../../../sample-mockups/popup.png)),
  triggered from an avatar/icon. A full standalone page isn't warranted
  given how little content this surface has right now.
- **Content**: signed-in Google account email, display only — no editable
  fields (the mockup's "S3 Bucket URL" field is a dropped placeholder from
  an earlier idea, see [../../index.md](../../index.md)'s mockups note). "Log
  out" and "Delete account" actions.
- **Editing/non-editing state**: does not apply — this surface is fully
  read-only except for the Log out / Delete account actions, so there's no
  reactive-data-editing concern from
  [../../../design-system.md](../../../design-system.md) to account for here.
- **Delete account confirmation**: a confirmation step is required before
  the delete actually executes — an inline "are you sure" state where the
  user must manually type text that exactly matches a given prompt (e.g.
  their email) before the delete action is enabled/submitted. Not a native
  browser `confirm()` dialog.

Uses the [site header](./header.md) as the underlying page context it's
triggered from (the modal itself has no separate header).
