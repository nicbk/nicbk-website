# Constraints and Behavior: The Contents Are Read

The feature's "Finding the contents" behavior and its constraints, plus:

- **New modules under `src/lit-tracker/contents/`**, one responsibility each:
  - `outline.ts`: bookmarks to entries, pure;
  - `heads.ts`: TEI to entries, pure;
  - `choose.ts`: which source wins, pure;
  - `read-outline.ts`: the pdfium lifecycle, open and close;
  - `contents-stage.ts`: the pipeline step.
- **The stage runs after extraction succeeds**, reusing the TEI that extraction
  already fetched. It never makes a second GROBID call for a new upload.
- **A failure to read contents never fails the upload.** The article is
  finished, and the contents row records the failure.
- **Migration and Zero schema** follow the README's steps: the generated schema
  is regenerated, and the table is named in `drizzle-zero.config.ts` and in the
  publication.
- **The e2e GROBID stub learns to emit numbered heads**, so the tier can see the
  fallback.

## Acceptance

The feature's criteria 1–3, verified in the database. The tab does not exist yet.
