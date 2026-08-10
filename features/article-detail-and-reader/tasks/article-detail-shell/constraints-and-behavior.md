# Constraints and Behavior: Article Detail Shell

The subset of
[the feature's acceptance criteria](../../constraints-and-behavior.md) this task
satisfies. Everything below must hold when the task's PR is opened.

## Routing and access

- The page is at **`/lit-tracker/$articleId`**, inside the existing
  `/lit-tracker` route group — its auth guard, header, app shell, and Zero
  client are inherited, not rebuilt.
- The article is read from **synced rows**, not fetched server-side.
- An id that **does not exist** and one that **belongs to another user** both
  produce the site's **not-found** treatment, indistinguishably. The second case
  is not a permissions error the user can tell apart from the first.
- The page must remain correct while the collection is **still syncing**: an
  article that has not arrived yet must not be drawn as a missing one. This is
  the same syncing/ready distinction #7 established and #8 preserved.

## The metadata summary

- Shows **title, authors, year, and venue**, each omitted entirely when absent —
  no placeholder text, no empty label.
- Authors follow the shared **`formatAuthors`** rule (fewer than three, show
  all; three or more, first author + "et al."). The helper is reused, not
  re-derived.
- Carries **#8's three-dot menu**, unmodified, with its tag and reading-status
  controls. #11 adds "edit…" and "delete…" to that same menu later.
- The page still draws **no visible `<h1>`-styled page title beyond the article
  title itself**; the focus-handoff landmark behavior the shell provides
  continues to work on this route.

## The sidebar

- Rendered as a **tab interface** on the same side as the collection's filter
  rail, with **exactly two tabs in this task**: Tags and Notes.
- **No Citations tab is rendered** — not as a disabled tab, not as an empty one.
- The tab list is a **real tab interface to assistive technology**, with the
  keyboard model that implies (arrow keys between tabs, the selected tab's panel
  associated with it), per
  [semantic-markup-and-aria-conventions.md](../../../../research/accessibility/semantic-markup-and-aria-conventions.md).
- **Which tab is active is local state**, not URL state. It is a view preference
  within a page, not something worth making shareable — the distinction
  [state-management-conventions.md](../../../../research/coding-conventions/state-management-conventions.md)
  draws.

## Tags tab

- Shows **this article's tags as toggles**, including its reading-status tag
  rendered among them, per the decided "reading status is itself a tag"
  presentation.
- Edits go through **#8's existing mutators** — create, attach, detach, set
  status. **No new mutator, and no second tag model.**
- Changes are **optimistic and live**: applied locally at once and visible in
  another window without a reload.
- A mutation the server rejects **surfaces to the user** through the existing
  toast rather than vanishing.

## Notes tab

- A **free-text field** for the user's own notes on the article, writing
  **`articles.notes`**.
- **No save button.** The value persists as the user types, debounced — a write
  per keystroke is not the requirement, and neither is a manual save.
- **A synced update must never overwrite text the user is currently editing**,
  per the decided editing-vs-non-editing rule in
  [design-system.md](../../../../research/ui-ux/design-system.md). This is the
  single most likely defect in this task.
- The notes mutator derives its owner from **`zeroContextFrom(session)`**, never
  from arguments, and **fails server-side** for an article the user does not
  own.
- Notes are **distinct from annotations** and this task introduces none.

## Responsive behavior

- **Above the breakpoint** the sidebar is visible and **open by default**.
- **Below it** the sidebar becomes the **toggleable drawer #8 built**, reused
  rather than reimplemented, and is **collapsed by default**.
- The sidebar does **not** stack below the main content at any width — the
  decided rule, whose reason is that stacking would put tags and notes behind a
  document's worth of scrolling once the reader exists.
- The drawer's transition respects **reduced-motion**.

## The card becomes a link

- Each card on `/lit-tracker` navigates to its article's detail page.
- **The card's three-dot menu still works**, and opening it, using it, or
  dismissing it does **not** navigate. This is the specific regression to guard.
- The card is a real link — middle-click, modifier-click, and the browser's own
  context menu all behave as they do for any link.

## The main content placeholder

- States that the reader is coming, occupying the space task 3 will fill.
- Is **not** a fake reader, a spinner, or an empty box. #7's reserved search
  slot is the precedent.

## Cross-cutting

- WCAG 2.2 AA: contrast in both themes, visible focus on every tab, toggle, the
  notes field, and the card link; the tab interface's keyboard model; state
  conveyed by more than color.
- Correct in both themes and at narrow, mid, and wide widths.
- CI green: Biome, typecheck (incl. CSS-Module codegen and the schema drift
  check), unit + integration with ratchet coverage, PR-title lint.
