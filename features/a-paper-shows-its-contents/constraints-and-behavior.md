# Constraints and Behavior: A Paper Shows Its Contents

## Behavior

### Finding the contents

- **Its own outline first.** Each entry gives a title, a depth, a 0-based page
  and, when its destination says so, a top in page points. Entries whose target
  resolves to no page are dropped. **The outline is used if two or more entries
  remain.**
- **GROBID's numbered heads second.** A `<head>` in the TEI body with an `n`
  attribute: its depth is the number of parts in `n` (`3` → 1, `3.1` → 2), and
  its place is its printed box from `teiCoordinates=head`. Heads without `n` are
  ignored.
- **Otherwise, none.** The row records that the paper was read and nothing was
  found, so it is not read again.
- **Titles are kept as printed**, trimmed of surrounding whitespace, and are
  shown as text, never markup.

### The tab

- **Fifth tab, *contents*, between *citations* and *annotations*.** The two tabs
  that scroll the reader sit together.
- **Entries are indented by depth**, and a long title wraps rather than
  clipping.
- **Choosing an entry scrolls the reader** so the section's top is at the top of
  the panel. If the citation graph is showing, choosing an entry brings the
  reader back first.
- **The section in view is marked**: the last entry whose start has reached
  the line a jump lands on, just below the reader's toolbar. Once the end of
  the paper is on screen, the line is the panel's bottom. *(Revised at
  implementation from "the panel's top third": measured against the third,
  choosing *2 Method* marked *2.1* whenever 2.1 began within a third of a
  screen of it. At the landing line, the entry chosen is the entry marked.)*
- **The list keeps the marked entry in view**, centred when the tab opens and
  moved only as far as needed after that, and never while the pointer is on
  the list.
- **Page numbers show where the sidebar has room**: in the sheet, not in the
  rail, where a textbook's three-digit numbers left titles too narrow to read.
- **Empty states, one each:**
  - *reading the contents…* while the job has not run;
  - *this paper has no outline or numbered sections* when nothing was found;
  - *couldn't read the contents* on failure, and for a paper whose extraction
    failed, which is never read for contents.

### The strip

- **One row at every width.**
  - **Rail (~143px):** five glyph tabs of equal width, about 28px each. That
    meets WCAG 2.2's 24px target minimum.
  - **Sheet:** words where all five fit on one line, glyphs where they do not.
    At 375px they do not; measured, four words already fill 326 of 327px, and
    five need 391px, so the glyph threshold is 25rem.

### The button

- **A *contents* button in the reader's toolbar**, beside the page field.
- **It opens the sidebar on *contents***: the rail's tab on a wide screen, the
  sheet on a narrow one. On a narrow screen, choosing an entry closes the sheet,
  since the reader is what it was opened for.

### Older papers

- **Every finished paper without a contents row is queued at worker start**,
  once. The job reads the stored PDF and runs GROBID again only if the PDF has
  no usable outline.
- **The job writes only the contents row.** It never touches metadata, the
  bibliography or `updated_at`, the same discipline as the reference re-read.

## Constraints

- **Server-side reading only.** The browser displays a stored list; it never
  reads the outline itself. There is one source of truth.
- **No new PDF dependency.** The pdfium engine from `@embedpdf/engines` and
  `@embedpdf/pdfium`, already installed, is used. Its WebAssembly is shipped to
  the production server as a Nitro server asset, because the self-contained
  bundle does not carry the file the engine would otherwise look for.
- **The TEI request changes by one field** (`teiCoordinates=head`), so new
  uploads pay no second GROBID call.
- **The table follows the project's Zero conventions** (`research/data-modeling/`):
  - keyed by its article, one row per paper, as `reference_reads` is (decided
    at implementation; a separate UUIDv7 key would only add a uniqueness
    constraint to keep);
  - `user_id` FK;
  - epoch-ms timestamps;
  - hard delete, cascading with its article;
  - added to the `zero_data` publication in its migration.
- **The jump reuses `link-preview-source.ts`'s coordinate conversion** and the
  scroll capability's `scrollToPage`, the same way a citation jump does.

## Acceptance criteria

1. A paper whose PDF carries an outline gets that outline, in order and nested,
   on upload.
2. A paper with no outline but numbered sections gets those sections, nested by
   their numbering. Figure labels do not appear.
3. A paper with neither shows *this paper has no outline or numbered sections*.
4. A paper uploaded before this feature has contents after the worker has run,
   and its metadata and references are unchanged.
5. Choosing an entry brings that section's heading to the top of the reader, on
   the right page, including from the citation graph.
6. The entry for the section in view is marked as the reader scrolls.
7. The tab strip is one row with five tabs in the rail, in the sheet at 375px,
   and at desktop width, in both themes.
8. The toolbar button opens the contents in the rail on a wide screen and in the
   sheet on a phone. On a phone, choosing an entry closes the sheet and the
   reader is at the section.
