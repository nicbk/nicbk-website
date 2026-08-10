# Status: Annotations

**State:** Not started. Fourth of five.

- Branch: `article-detail-and-reader/annotations`, from `main` after task 3
  merges.
- Sub-issue: filed with the feature's parent issue at spec review.
- PR: opened once the unit and integration tiers and the browser pass are all
  clean.

## Open items to settle before writing

- **Re-verify EmbedPDF's annotation API against the installed version.** It
  moved between the 2026-07-02 technology decision and this spec — document
  -scoped `useAnnotation(documentId)`, page-index arguments on update and
  delete, and two newly-required peer plugins
  (`@embedpdf/plugin-interaction-manager`, `@embedpdf/plugin-selection`). By the
  time this task starts, that check will itself be old. Research over recall.
- **Confirm the exact shape of the `committed` flag** on the annotation event,
  and whether every event type carries it. The whole write path is gated on it,
  so it is worth reading rather than inferring.
- **Where the bridge lives.** It is neither a component nor a mutator — it
  subscribes to an engine and calls Zero. Giving it its own module with its own
  tests is what makes the committed-only rule assertable without an engine.
- **Whether import-at-load races the reader.** Annotations arrive by sync and
  the document arrives by fetch; the order is not guaranteed. Decide what
  happens when rows arrive before the document is ready, rather than finding out
  from a paper that opens unmarked.

## Log

- (not started)
