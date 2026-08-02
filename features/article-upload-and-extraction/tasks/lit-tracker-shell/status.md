# Status: Lit Tracker Shell

**State:** Not started. Second of five; depends on `zero-sync-foundation`.

- Branch: `article-upload-and-extraction/lit-tracker-shell` (to be created).
- Sub-issue: [#68](https://github.com/nicbk/nicbk-website/issues/68)
  (parent [#66](https://github.com/nicbk/nicbk-website/issues/66)),
  unassigned — self-assign before starting.
- PR: —

## Notes carried into implementation

- **The header is a separate component, not a variant of the site header** —
  the decided spec is explicit, and the layout models genuinely differ (fixed
  app shell vs. sticky header on a scrolling page). Do not try to
  parameterize one component into both.
- **Reuse, do not rebuild.** `requireAuth` and the user-settings modal already
  exist, tested, from #6; this task wires them, it does not reimplement them.
  Its docstring even names this route pattern as the intended use.
- **The plain list is a host surface, not a placeholder.** #8 upgrades it in
  place; write it to be replaced cleanly, not thrown away.
- **Separated type imports matter here specifically.** This is a protected
  route naming server-only types — the exact shape that leaked server modules
  into the client bundle in #6's task 3. Verify the built client bundle carries
  no server-only module, the way that bug was caught.
- **Verify in the browser before the PR.** Both themes, three widths, panel
  scrolling, keyboard-driven avatar → modal, and live sync watched directly.
  Tests alone have missed layout and bundle bugs on this project twice.

## Log

- 2026-08-01 — Task defined during the feature spec. Second of five; not yet
  started.
