# Testing: Citation-Graph Traversal

## Unit

- **Merged-row rule** (task 1): the two real garbled titles are dropped; a short
  resolved title ("Adam") inside a long unrelated one is not; a resolved row is
  never dropped; rows of another citing article are not compared.
- **Printed text and count** (task 1): `writeBibliography` stores `raw`;
  enrichment stores `referenceCount`; extraction sets `references_read_at`.
- **Re-read** (task 2): which articles are queued (finished, unread, not
  already queued); the summary and warning rows' text and counts; try again
  re-queues only the failed.
- **Citations view** (task 4): the two tabs' counts; the *cites* groups and
  their order; item content; link `href`, `target` and `rel`; no link without an
  id; the three empty messages; no count comparison; the header's credits.
- **Tab and swap** (task 4): `view=citations` hides the reader without unmounting
  it; another tab clears it.
- **Path** (task 5): append; cut back on revisit; path link truncation; no path
  from the collection; fold above three; 20-id cap; unknown ids dropped; labels
  from edges, none when no edge.

## Integration

- **Queries** (task 3), against Postgres and the committed migrations: the
  requester's edges and related articles come back; another user's, and
  anonymous requests, return nothing, with rows genuinely present either way.
- **Re-read** (task 2): printed text and count filled; merged rows removed;
  graduation still links; edited title/authors/notes/status/reading position
  unchanged; a second worker start queues nothing new.

## Browser

| Check | Where |
|---|---|
| re-read on worker start: summary row counts down and disappears | Chrome, local |
| forced failure: warning row, no dismiss, try again clears it | Chrome, local |
| Citations tab: two tabs, groups and counts on *Attention* | Chrome, local |
| to Citations and back: same place, no PDF request | Chrome, local |
| in-collection item opens the paper; path extends | Chrome, local |
| outside link opens Semantic Scholar in a new tab | Chrome, local |
| five hops: fold, "…" menu, cut back on revisit, reload, back | Chrome, local |
| phone width: sheet closes on Citations; path shows "…" + current | Safari, 375px bounds |
| the whole flow | Safari, `nicbk.com` after deploy |

Reload before every check. Use windows the agent created; close them by id.
