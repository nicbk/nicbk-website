# Testing: A Paper Shows Its Contents

## Unit

- **Outline → entries:**
  - flattening with depth;
  - destination and go-to-action targets;
  - dropping unresolvable entries;
  - the two-entry rule (a junk one-entry outline is rejected).
- **TEI heads → entries:**
  - numbered heads only;
  - depth from `n`;
  - the box parsed with the existing `tei/regions.ts`;
  - fixtures from real GROBID output.
- **Source choice:** outline over heads over none.
- **The tab:**
  - entries render indented;
  - a choice calls the jump with page and top;
  - the section-in-view rule;
  - each empty state.
- **The strip:** five tabs; the glyph threshold in the sheet; tab widths equal
  in the rail.

## Integration

Against Testcontainers Postgres, as the pipeline's integration tier already is:
- the stage writes one row per article;
- the backfill queues each finished paper without a row exactly once;
- the backfill never changes `updated_at`;
- a failed read leaves no partial row.

## Browser

| Check | Engine |
|---|---|
| a paper with an outline: list, nesting, jump | Chromium |
| a paper without one (TraceMonkey): GROBID's numbered sections, no figure labels | Chromium |
| the strip at desktop, 1024px and 375px, light and dark | Chromium |
| the toolbar button at desktop and at 375px | Chromium |
| the strip and the sheet on an iPhone | Safari (user check) |

The stack's GROBID stub answers from a directive in the uploaded file
(`e2e-auth/support/grobid-stub.mjs`) and returns no body heads today. Task 1
extends it to emit numbered heads with coordinates, modelled on the real GROBID
run in `research.md` §3.
