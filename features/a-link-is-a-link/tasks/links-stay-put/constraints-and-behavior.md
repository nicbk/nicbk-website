# Constraints and Behavior: Links Stay Put

The feature's constraints apply. Specific here:

- **The lock names a category only the link tool carries.** Verified in a unit
  test over the registered tool list.
- **The renderer is registered, not forked** — `useRegisterRenderers` with id
  `link`, so a library upgrade that changes the built-in does not silently
  replace it.
- **Clipboard failure is reported**, with the existing error toast. A copy the
  reader believes happened and did not is the kind of quiet lie this feature
  removes.
- **The confirmation toast is new to the site.** Style it as the error toast's
  quiet sibling and show the result in the PR; the user reviews it.
- **Text selection over a citation** is checked in the browser before the PR,
  both drag directions. If the click target blocks it, that is raised before any
  workaround.

## Acceptance

Feature criteria 1–3.
