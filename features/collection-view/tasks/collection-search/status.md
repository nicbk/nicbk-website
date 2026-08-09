# Status: Collection Search

**State:** Not started. Fourth of four.

- Branch: `collection-view/collection-search` (not yet created).
- Sub-issue: not yet filed.
- PR: none.

## Notes carried into implementation

- **One predicate, one place.** Search extends the filter predicate task 3
  built; it does not add a second filtering path beside it. The composition is
  the feature's point.
- **Use the shared `SearchInput`.** The decided spec describes the blog's search
  bar and the tracker's as the same control — `blog-list.md` cites the tracker's
  style, and `collection-view.md` cites the blog's sidebar. They are one
  component.
- **Typing must not wait on a navigation.** The blog's hook keeps the query in
  local state so the list reacts instantly and mirrors to the URL on a debounce.
  Reproducing only the URL half would make every keystroke wait on the router.
- **Infinite scroll is revealing, not fetching** — `useIncrementalReveal` over
  rows already synced, applied to the *filtered* set.
- **The toolbar slot exists and is waiting.** `.searchSlot` in
  `collection-toolbar.module.css` holds the row open so the controls already sit
  where the input's trailing edge will be; filling it should move the controls,
  not require repositioning them. The requirement, confirmed with the user, is
  that the "+" and the status indicator stay **immediately against the input's
  trailing edge** at every width rather than drifting to the column's far edge.
- **Do not disturb the upload controls.** Their behavior is #7's and is covered
  by #7's e2e tests; this task changes position only.
- **Announce results politely, not per keystroke.** A status region that fires
  on every character is worse than none.
