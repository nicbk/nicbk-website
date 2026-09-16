# Constraints and Behavior: The Entry is Located

The feature's Data, Extraction and Security constraints, plus:

- **One added form field**, `teiCoordinates=biblStruct`. Nothing else about the
  request changes.
- **The parser keeps a page and its rectangles per entry**, in TEI's order, and
  nothing for an entry with no `coords`.
- **`entry_regions` is written by the bibliography writer only**, with the rest
  of the row.
- **The backfill's condition is the data, not a timestamp**: finished articles
  holding edges with no regions. `references_read_at` cannot serve — #10 set it
  on every paper.
- **The re-read's bar list stands**: it may not write title, authors,
  publication year, venue, doi, abstract, notes, status or the reading position.

## Acceptance

Feature criteria 4 and 5, and the parsing half of 1.
