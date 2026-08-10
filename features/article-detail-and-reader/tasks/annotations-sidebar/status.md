# Status: Annotations Sidebar

**State:** Not started. Fifth of five — the last task of the feature.

- Branch: `article-detail-and-reader/annotations-sidebar`, from `main` after
  task 4 merges.
- Sub-issue: filed with the feature's parent issue at spec review.
- PR: opened once the unit tier and the browser pass are both clean.
- **On merge, close the feature's parent issue by hand.** GitHub does not close
  a parent when its sub-issues close.

## Open items to settle before writing

- **What a textless annotation's row says.** An ink stroke and a circle have no
  `contents` by nature. The type name and the page ("Ink — page 4") is the
  obvious answer, but it is a wording decision on a surface the user reads, so
  it is worth settling deliberately rather than defaulting.
- **How the list reaches the reader.** The tab and the reader are siblings under
  the detail page; the page-jump call has to cross between them. Decide whether
  that is a callback threaded from the page or something the reader exposes —
  and prefer whichever leaves #10's Citations tab an easier thing to add.
- **Ordering.** By page, then by creation time, is the obvious reading order,
  but nothing decided says so. Pick and record it.

## Log

- (not started)
