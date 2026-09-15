# Upload Status Indicator & Job List

Status: Decided 2026-07-02.

A status icon/button next to the "+" add-article button on
[collection-view.md](../pages/collection-view.md), tracking background PDF
metadata extraction jobs kicked off by [upload-flow.md](./upload-flow.md).
Clicking it opens a popup listing in-progress and problem uploads.

- **Icon states**:
  - Uploads in progress: an "uploading" symbol; clicking opens the job
    list popup showing per-article progress.
  - Nothing in progress, nothing failed: a non-clickable checkmark; hover
    shows a tooltip reading "All articles synced".
  - One or more articles failed metadata extraction: a warning icon;
    clicking opens the same popup, with the problem article(s) marked by a
    warning icon.
- **Job list popup — row content**:
  - In-progress job: filename plus a progress indicator.
  - Failed job: filename, a warning icon, and a short failure reason (e.g.
    "couldn't find authors").
  - No special grouping/summary for multiple simultaneous failures — each
    is just its own row in the same flat list.
- **Row lifecycle**: a job's row disappears from the list immediately once
  it resolves — either extracted successfully, or the problem is resolved
  via [article-edit.md](./article-edit.md) (edited or deleted). The list
  only ever contains jobs still needing attention (in progress or
  unresolved failures), never a lingering history of completed ones.
- Problem articles in the job list popup open in
  [article-edit.md](./article-edit.md) to manually fill in fields the
  extractor couldn't find, or to delete the article entirely.

Uses the [lit-tracker header](./header.md) as underlying page context (the
popup itself has no separate header).

## Revision (2026-09-14): the indicator also shows a re-read of older papers

Decided with the user during #10
([`older-papers-are-re-read`](../../../../../features/citation-graph-traversal/tasks/older-papers-are-re-read/description.md)).
Papers read before printed reference text was kept are re-read automatically on
deploy, and this indicator is where that shows. Two departures from the bullets
above, both deliberate:

- **A summary, not a row per paper.** "re-reading references · 7 of 12 papers",
  one row however large the batch. The flat-list rule above is for uploads, each
  of which the reader started; a re-read is many papers the reader did not.
- **A failure with no way to set it aside.** "couldn't re-read references for N
  papers · their old references are kept", with **try again** and no dismiss:
  the warning is how the reader knows those papers are behind, so it clears only
  when they catch up.

The icon's rules are unchanged: a failure outranks work in progress, and the
checkmark means nothing is outstanding of either kind.
