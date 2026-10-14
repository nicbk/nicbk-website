# Request: A Collapsible Outline

Source: the first bullet of [as-written.md](./as-written.md).
Path: **plan directly** (no research phase), per the user.
Builds on: feature #29,
[`a-paper-shows-its-contents`](../../../features/a-paper-shows-its-contents/description.md)
(the contents tab), and feature #23,
[`a-paper-opens-where-you-left-it`](../../../features/a-paper-opens-where-you-left-it/description.md)
(the saved place the user names as the model).

## The user's words

> let's make the outline list collapsible (oftentimes the outline is
> hierarchical, and as currently shown, all headings are listed linearly which
> is too much on certain documents. Instead, the outline should be fully
> collapsed when accessed for the first time. Then, similar to how the scroll
> position in the page is preserved, let's also preserve the current collapse
> state of the outline for future accesses of the document.

## Requirements

| ID | Requirement | The user's words |
|---|---|---|
| O1 | The outline list is collapsible. Each entry with sub-entries can be collapsed and expanded. | "let's make the outline list collapsible" |
| O2 | Why: outlines are hierarchical, and listing every heading flat is too much on some documents. The fix must make a long, deep outline manageable, not just add toggles. | "oftentimes the outline is hierarchical, and as currently shown, all headings are listed linearly which is too much on certain documents" |
| O3 | The first time a document's outline is opened, it is **fully collapsed**. | "the outline should be fully collapsed when accessed for the first time" |
| O4 | The collapse state is **saved per document** and restored on later visits. | "preserve the current collapse state of the outline for future accesses of the document" |
| O5 | It is saved **the way the page's scroll position already is**. Feature #23 saves the reading place per user and per paper, and restores it on any device. | "similar to how the scroll position in the page is preserved" |

## Questions the plan must answer

- **O3, "fully collapsed".** Reading: only the top-level entries show. The plan
  must also say what happens when the marked "section in view" is inside a
  collapsed entry. #29 marks it and keeps it in view.
- **O4/O5, scope.** Is the state saved per user and per paper, synced across
  devices like the reading place? Reading: yes, because that is what #23 does.
- **The sheet and the rail** are two views of one list. Reading: they share one
  saved state.
- **Choosing an entry** must still jump the reader, as in #29. Toggling an
  entry's children must be a separate control, so the two don't fight.
- **A paper whose outline changes** (re-read, or found later by the backfill):
  the saved state refers to entries that may no longer exist.
- **Encryption (see [data-privacy-and-hardening.md](./data-privacy-and-hardening.md)).**
  The collapse state is user data like the reading place. If that request moves
  user data to a new scheme, this state moves with it. It is not a reason to
  wait.
