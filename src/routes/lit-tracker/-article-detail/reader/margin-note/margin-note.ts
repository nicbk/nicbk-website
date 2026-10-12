import type {
  PdfAnnotationFlagName,
  PdfAnnotationObject,
  PdfFreeTextAnnoObject,
  Rect,
} from '@embedpdf/models'
import { PdfAnnotationSubtype } from '@embedpdf/models'

/**
 * What a margin note is: a text box that answers a highlight
 * (features/a-passage-gets-a-margin-note).
 *
 * **Built from the PDF's own vocabulary**, so nothing here is a new kind of
 * annotation and nothing needs a new column:
 *
 * - `inReplyToId` — the PDF's `IRT` entry — names the highlight. EmbedPDF
 *   deletes an annotation's replies with it, which is the decided "deleting the
 *   highlight deletes the note", for free.
 * - the `locked` flag makes the engine refuse to move, resize or rotate it,
 *   while it stays selectable and editable. Its place is its passage's
 *   (user-decided 2026-10-12), so the reader must not drag it away.
 *
 * The sync bridge stores every engine field it does not explicitly exclude, so
 * both survive a reload unchanged (`annotation-sync/annotation-row.ts`).
 */

/** The PDF flag that pins an annotation's geometry. */
const LOCKED: PdfAnnotationFlagName = 'locked'

/**
 * Whether `annotation` is a margin note — the three things that make one, all
 * present. A text box a reader placed by hand has no `inReplyToId`, and is free
 * to move as it always was.
 */
export function isMarginNote(annotation: PdfAnnotationObject): boolean {
  return (
    annotation.type === PdfAnnotationSubtype.FREETEXT &&
    typeof annotation.inReplyToId === 'string' &&
    (annotation.flags ?? []).includes(LOCKED)
  )
}

export interface MarginNoteFields {
  /** The text box tool's own defaults: the red, the font, #24's 8pt. */
  defaults: Partial<PdfFreeTextAnnoObject>
  id: string
  pageIndex: number
  rect: Rect
  /** The highlight this note answers. */
  highlightId: string
  created: Date
}

/** The note to create, beside the highlight it answers. */
export function marginNoteFrom({
  defaults,
  id,
  pageIndex,
  rect,
  highlightId,
  created,
}: MarginNoteFields): PdfFreeTextAnnoObject {
  return {
    ...defaults,
    type: PdfAnnotationSubtype.FREETEXT,
    id,
    pageIndex,
    rect,
    created,
    // Empty rather than the tool's "Insert text" prompt: the reader starts
    // typing at once, and a note left empty is removed (`use-empty-note-removal.ts`).
    contents: '',
    inReplyToId: highlightId,
    flags: ['print', LOCKED],
  } as PdfFreeTextAnnoObject
}
