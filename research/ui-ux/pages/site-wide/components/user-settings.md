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

## Revision — 2026-08-08: the dialog header is one row

The mockup stacks the dismiss control and the title: `×` alone on the card's
first line, the heading beneath it. **Modals on this site put the two on one
row instead** — title leading, dismiss trailing.

Decided by the user during #7's task 3, on the grounds that a control alone on
the first line spends a whole row of the card's height saying nothing. Title
first so it anchors the card's top-left corner and the reading order starts with
what the dialog *is* rather than with what closes it.

This is a **site-wide** rule, not a lit-tracker one: it applies to this modal
and to the Lit Tracker's upload modal
([../../lit-tracker/components/upload-flow.md](../../lit-tracker/components/upload-flow.md)),
and any dialog added later should match. It is one of the places where the
mockup is a rough reference rather than literal spec — see
[../../index.md](../../index.md)'s mockups note.
