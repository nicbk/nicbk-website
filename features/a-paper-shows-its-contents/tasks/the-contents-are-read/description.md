# Task: The Contents Are Read

Task 1 of 4 of [#29](../../description.md). Sub-issue [#245](https://github.com/nicbk/nicbk-website/issues/245).

- An `article_contents` table: one row per article holding a source, the
  entries as `jsonb` and a read time. It is synced through Zero and cascades
  with its article.
- A pipeline stage that reads the PDF's outline with the server-side pdfium
  engine, falling back to GROBID's numbered heads. The extraction's GROBID
  request gains `teiCoordinates=head` for this.
