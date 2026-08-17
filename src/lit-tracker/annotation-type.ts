/**
 * The kinds of mark a reader may leave on a paper, as they are stored.
 *
 * Its own module for the same reason `article-status.ts` is one: the Drizzle
 * schema types a column with it, a Zero mutator validates an incoming value
 * against it, and the reader's toolbar offers it — and mutators are shared code
 * that runs in the browser, so importing this from `db/schema/lit-tracker.ts`
 * would drag Drizzle's Postgres dialect into the client bundle to read twelve
 * strings.
 *
 * **These are names, not EmbedPDF's numbers.** The engine identifies an
 * annotation by `PdfAnnotationSubtype`, a numeric enum whose values are the PDF
 * specification's own ordering. Storing `9` for a highlight would make every row
 * unreadable without the library and would tie the database to an enum this
 * project does not own; the reader translates between the two in one place
 * (`-article-detail/reader/annotation-sync/annotation-row.ts`).
 *
 * **Twelve, and the omissions are decisions.** PDF has more annotation types and
 * EmbedPDF implements most of them. `stamp` is excluded because it is the one
 * type carrying binary image data, which the decided schema exists to avoid
 * (research/data-modeling/annotations-schema.md); `link`, `popup` and `widget`
 * are excluded because they are furniture a PDF arrives with rather than
 * something a reader makes — a paper full of citation links must not become a
 * paper full of rows.
 */
export const ANNOTATION_TYPES = [
  // Anchored to selected text.
  'highlight',
  'underline',
  'strikeout',
  'squiggly',
  // Drawn on the page.
  'ink',
  'square',
  'circle',
  'line',
  'polyline',
  'polygon',
  // Carrying the reader's own words.
  'freeText',
  /** The sticky note. Named for the PDF subtype it is, `Text`. */
  'text',
] as const

export type AnnotationType = (typeof ANNOTATION_TYPES)[number]

/**
 * Everything about a mark that is specific to its kind: the rectangle it
 * occupies, its colours, an ink stroke's points, a shape's vertices, a free
 * text's font.
 *
 * Stored as one `jsonb` column mirroring EmbedPDF's own object shape, because
 * nothing in this project ever filters, sorts, or joins on any of these fields
 * individually and thirteen normalized tables would fight the library's
 * object-shaped API for no query benefit
 * (research/data-modeling/annotations-schema.md).
 *
 * Deliberately untyped beyond "a JSON object". The precise shape belongs to
 * EmbedPDF and differs per type; the one module that knows it is the translation
 * layer, which is where a wrong assumption would show up in a test rather than
 * in a column definition.
 *
 * **That it is JSON, though, is not a detail.** A payload ends up in a `jsonb`
 * column and travels through Zero, and neither can carry anything else — so the
 * type says so, and the translation layer's job includes dropping the one thing
 * EmbedPDF supplies that is not JSON: its `Date` timestamps.
 */
export type AnnotationPayload = Record<string, JsonValue>

/** Anything `JSON.stringify` round-trips, which is exactly what `jsonb` holds. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
