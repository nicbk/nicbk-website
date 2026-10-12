# Status: The Contents Are Read

**State:** Merged ([#245](https://github.com/nicbk/nicbk-website/issues/245); PR [#252](https://github.com/nicbk/nicbk-website/pull/252)).

## What shipped

- **`article_contents`** (migration 0009): one row per article, keyed by it,
  holding `source` (`outline` / `headings` / `none` / `failed`) and `entries`
  (`jsonb`). It cascades with its article, is added to the `zero_data`
  publication in the same migration, and is named in `drizzle-zero.config.ts`;
  the generated Zero schema is regenerated. No client query reads it yet; that
  is task 3's.
- **`src/lit-tracker/contents/`**:
  - `contents.ts`: the entry shape;
  - `outline.ts`: bookmarks to entries, plus the two-entry rule;
  - `choose.ts`: outline, else headings, else none;
  - `read-outline.ts`: the server's pdfium, one engine per process, each
    document closed after;
  - `pdfium-wasm.ts`: where the engine's WebAssembly comes from.
- **`extraction/tei/sections.ts`**: GROBID's numbered body headings, nested by
  number and placed by their `head` box. The GROBID request now asks for
  `teiCoordinates=head` alongside `biblStruct`.
- **The extract stage** reads the outline after GROBID answers and writes the
  contents in the transaction that creates the article. If the outline cannot
  be read, the headings stand in; if there are none either, the row says
  `failed`. The upload never fails for it.
- **`src/lit-tracker/pdf/destination.ts`**: `destinationOf` and `targetTop`,
  moved out of the reader's link preview so the server reads a destination
  exactly as the reader does.
- **The e2e GROBID stub** emits numbered headings with boxes on request
  (`sections` in its directive), and **`e2e-auth/contents.spec.ts`** checks all
  three outcomes through the real worker.

## Decided at implementation (2026-10-12)

- **The engine's WebAssembly ships as a Nitro server asset.** This was found by
  building for production, not by any test. The bundled server keeps pdfium's
  `new URL('pdfium.wasm', import.meta.url)`, which resolves to
  `.output/server/_libs/@embedpdf/pdfium.wasm`, and no such file is emitted;
  the only copy was the browser's, under `.output/public/assets`. Every outline
  read in production would have failed while development, the unit tier and
  the integration tier all passed. `vite.config.ts` now declares the file as a
  server asset; Nitro embeds it in the bundle (`_libs/@embedpdf/pdfium.mjs`,
  8.2 MB). `pdfium-wasm.ts` reads it from the installed package where there is
  one, and from the asset where there is not.
- **One row per article, keyed by it**, rather than a separate UUIDv7 key, as
  `reference_reads` already does: the contents are read and replaced whole.
- **Contents are written only when extraction succeeds.** A paper whose
  extraction failed is not finished, and the backfill (task 2) can read its
  contents later.
- **The destination helpers moved** rather than being copied. A second copy of
  "what a PDF destination means" is the duplication `AGENTS.md` warns about.

## Verified

- **Unit:**
  - outline flattening, the junk-outline rule, the source choice, numbered
    heads (with the real paper's noise modelled), the extract stage's three
    outcomes, and both WebAssembly paths;
  - `read-outline.test.ts` runs the real engine on a synthetic outlined
    fixture (`contents/fixtures/outlined.pdf`, generated, no paper's content);
  - the three mutation checks fail as they should: a one-entry outline (2
    tests), unnumbered heads (2), contents for a failed extraction (2);
  - the full suite (2144), typecheck and lint pass; line coverage is 95.05%.
- **Integration (real Postgres and Garage):** the stage writes an `outline` row
  from the fixture and a `headings` row for a PDF the engine cannot open. Both
  publication guards now list `article_contents`. The full tier passes (182).
- **On a production build** (`CI=true`, the signed-in stack), uploading through
  the UI:

  | upload | row |
  |---|---|
  | the outlined fixture | `outline`: 3 entries, nested, the first at 180pt |
  | TraceMonkey (real, no outline), with headings in the stub's answer | `headings`: nested by number, pages and tops from the boxes |
  | a bare PDF, no headings | `failed`, and the paper is finished |

## Log

- 2026-10-12: spec'd.
- 2026-10-12: implemented. A production build showed the engine's WebAssembly
  missing from the server bundle; it is shipped as a server asset now, and
  verified there.
