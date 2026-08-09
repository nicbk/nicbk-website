# Status: Collection Filters

**State:** Not started. Third of four.

- Branch: `collection-view/collection-filters` (not yet created).
- Sub-issue: not yet filed.
- PR: none.

## Notes carried into implementation

- **Reuse the blog's filter machinery.** `TagFilter`, `useBlogFilters`'s
  URL-mirroring shape, and `filterPosts` all exist, and `collection-view.md`
  names the blog's sidebar as this one's precedent. Extract what genuinely fits
  and share it; do not write a second copy that drifts.
- **Keep the blog's pointer-versus-keyboard focus fix.** Its `TagFilter` blurs a
  toggle activated by pointer (`event.detail > 0`) but not one activated by
  keyboard, because a retained focus ring on a *deselected* tag reads as still
  selected. That fix came out of real use; losing it in a rewrite would be a
  regression nobody would think to test for.
- **AND, not OR.** An article must carry every selected tag. Easy to invert, and
  invisible until a user selects two.
- **The rail becomes a landmark only now.** #7 deliberately left it un-named
  because an empty navigation region announces nothing; naming it is part of
  this task, not an afterthought.
- **Media query for the rail, not a container query.** The decided design system
  names this rail as its example of a page-level structural shift; the
  container-query rule belongs to the card.
- **Three empty states, not two**: still syncing, genuinely empty, and filtered
  to nothing. Conflating the last two is the mistake this task can most easily
  make.
- **No per-tag counts.** The schema doc checked specifically that no decided
  surface requires them, which is part of why `tags` has no counting support.
