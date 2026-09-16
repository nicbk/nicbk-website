# Plan: A Citation Opens the Paper

| # | Task | Sub-issue | Delivers |
|---|---|---|---|
| 1 | [`the-entry-is-located`](./tasks/the-entry-is-located/description.md) | TBD | `teiCoordinates=biblStruct`, the parsed rectangles, `entry_regions`, and the backfill of older papers |
| 2 | [`the-preview-knows-the-paper`](./tasks/the-preview-knows-the-paper/description.md) | TBD | The pure matching rule, and the preview knowing which edge it is showing |
| 3 | [`open-in-tracker`](./tasks/open-in-tracker/description.md) | TBD | The action, what it opens, and the hop it records |

## Why this order

- **The data first, and its agreement proved first.** Task 1 ends by checking a
  stored rectangle against the same reference's previewed region on a real
  paper. If the two coordinate spaces disagree, that is the moment to find out —
  before a matching rule or a control is built on the assumption.
- **The rule before the control.** Task 2 is assertable without a browser and
  carries the decision that matters (one edge or none). Task 3 is then a link.

## Risks

- **The coordinate spaces may not agree.** Both are documented as top-left with
  y downward, and neither has been observed against the other. Task 1 proves it
  on a real paper and reports the numbers; a mismatch is a transform, not a
  redesign, but it has to be measured rather than assumed.
- **A preview region may cover two entries.** Reference lists are tightly set,
  and #22's region finder works from a link's landing rather than from entry
  boundaries. The rule answers "neither" in that case, and its test is the
  proof; the browser check on a real bibliography is what says how often it
  happens.
- **Older papers need the re-read, and #10's trigger is spent.**
  `references_read_at` is set on every paper now, so the backfill's condition is
  "has edges with no regions" rather than that column. Its visible behaviour is
  #10's, unchanged.

## Dependencies

#7 (extraction, the bibliography writer), #10 (the edges, the re-read, the path
rules), #22 (the preview and its region finder).
