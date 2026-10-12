import type { PdfAnnotationObject, Rect } from '@embedpdf/models'
import type { AnnotationDocumentState } from '@embedpdf/plugin-annotation'
import { isMarginNote } from './margin-note'

/**
 * What to outline when a margin note or its passage is selected: the other one
 * (features/a-passage-gets-a-margin-note, task 2).
 *
 * The note and its highlight read as one only if picking up either shows both;
 * this is what the decided "no leader line" left to carry the link. Drawn by
 * this reader rather than by selecting both in the engine, because a
 * multi-selection changes what the mark's own menu offers.
 */
export function linkedPartners(
  state: Pick<AnnotationDocumentState, 'byUid' | 'selectedUids'>,
  pageIndex: number,
): Rect[] {
  const partners: PdfAnnotationObject[] = []
  for (const uid of state.selectedUids) {
    const selected = state.byUid[uid]?.object
    if (!selected) {
      continue
    }
    if (isMarginNote(selected) && selected.inReplyToId) {
      const highlight = state.byUid[selected.inReplyToId]?.object
      if (highlight) {
        partners.push(highlight)
      }
      continue
    }
    // A highlight: its margin notes are the annotations answering it.
    for (const tracked of Object.values(state.byUid)) {
      const other = tracked.object
      if (isMarginNote(other) && other.inReplyToId === selected.id) {
        partners.push(other)
      }
    }
  }
  return partners
    .filter((partner) => partner.pageIndex === pageIndex)
    .map((partner) => partner.rect)
}
