# Testing: Resolving a Failed Upload

What this task's tests must cover. Feature-wide tiers are in
[../../testing.md](../../testing.md).

## Unit (Vitest, jsdom)

- **A failed row opens the modal for its own article** — with several failed rows
  present, the right one.
- **The control is named for the article it opens**, not a bare icon repeated
  down the list.
- **The modal opens focused on a missing field** rather than on the first field
  regardless.
- **A successful edit of a failed article retires its job row**, in the same
  mutation that saved the metadata.
- **A `processing` job is not retired** by an edit — only a failed one.
- **`extraction_status` is unchanged** by the edit that retires the row.
- **`uploadStatusState` still ranks a failure above work in progress**, and
- **returns to the checkmark** once the last failed row is gone.
- **Focus has somewhere to go** when the modal closes and the row it was opened
  from no longer exists.

## Integration (Testcontainers Postgres)

- Editing a failed article through the real mutator, against a real database,
  leaves no `upload_jobs` row for it and leaves `extraction_status` as `'failed'`.
- Editing a still-processing article leaves its job row in place.
- The retirement is scoped to the session's own user: an edit cannot remove
  anyone else's job row, including one that happens to share an id shape.

## Browser verification (record in status.md — primary evidence)

Needs a genuinely failed upload, not a simulated one — upload something GROBID
cannot read and let the pipeline fail it, so the row under test is the row the
pipeline really writes.

- The warning icon appears, the popup lists the row with its failure reason.
- The row opens the modal on the missing fields; the title is the filename and
  the author list is empty, which is the state the form has to meet.
- Saving real metadata clears the row, and the header returns to its checkmark.
- The other route: a second failed upload, deleted instead, clears the same way.
- Both overlays together read as one live surface, not two.
- Console clean.

## Coverage

Ratchet applies. Everything here is either pure (the status derivation, already
covered) or directly testable through the real components.
