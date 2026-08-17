# Status: Annotations Sidebar

**State:** In progress. Fifth of six — no longer the feature's last:
[`reader-text-tools`](../reader-text-tools/status.md) (#105) was added after
this task was spec'd, and the close-#95-by-hand duty moved there with it.

- Branch: `article-detail-and-reader/annotations-sidebar`, from `main` at
  `3b48d0b` (task 4's merge).
- Sub-issue: [**#100**](https://github.com/nicbk/nicbk-website/issues/100),
  self-assigned before work began.
- PR: opened once the unit tier and the browser pass are both clean.

## Open items, as settled (with the user, 2026-08-16)

- **A textless row shows the tool's own name** — "freehand", "rectangle",
  "ellipse", the same words `annotation-tools.ts` puts in the toolbar's menu —
  styled muted so it reads as a label rather than as content. One vocabulary
  across the toolbar and the list, and the page number sits in its own slot on
  every row either way.
- **The jump crosses from the rail to the reader through a context mounted at
  the route layout** (`route.tsx`). The sidebar renders in the shell's rail,
  which is a *sibling* of the page, so no callback prop can span the two; the
  layout is the only level that sees both, and it is the same level #10's
  tab-swap state will need — so this leaves the Citations tab easier, as the
  spec asks. The reader registers its scroll handle on mount; the panel calls
  it; with no reader mounted the call is a no-op.
- **Ordering was already decided in the query.** `annotations.forArticle`
  sorts by `page_index` then `created_at`, and its own comment says it does so
  for this sidebar. The list reuses that query as-is — the same subscription
  the reader's sync bridge holds, so the list costs no new round trip.

## The finding that widened an assumption

**Highlights are textless too.** The spec framed empty `contents` as the ink-
and-shapes case, but EmbedPDF never captures the selected text — confirmed
against the dev database (every text-markup row's `contents` empty, and the
payload carrying only rects and colours). So the fallback is the common case
for now, not the edge: only the two "write" tools put words in a row. Accepted
for this task with the user; **task 6's text-association is what fills the
snippets**, and this list needs no change when it does — rows with `contents`
already show it.

## Log

- 2026-08-16 — Started, immediately after task 4 merged. Open items settled
  with the user (above), task 6 filed as #105 on this branch so the parent
  issue counts six sub-issues, and the stale merge state in the feature docs
  brought current.
